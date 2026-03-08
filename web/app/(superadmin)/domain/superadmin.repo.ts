/**
 * Superadmin 模块数据访问层
 * 模型定价、供应商、用量统计
 */
import { prisma } from '@/lib/db'

export async function getModelPricingList() {
  return prisma.modelPricing.findMany({
    orderBy: [{ provider: 'asc' }, { modelName: 'asc' }],
    include: {
      providerRef: true,
    },
  })
}

export async function getProviderList() {
  return prisma.provider.findMany({
    orderBy: { code: 'asc' },
    include: {
      _count: { select: { modelPricings: true } },
    },
  })
}

export async function createProvider(data: {
  code: string
  name?: string | null
  baseUrl: string
}) {
  const code = data.code.trim()
  if (!code) throw new Error('供应商代码不能为空')
  if (!data.baseUrl?.trim()) throw new Error('Base URL 不能为空')
  return prisma.provider.create({
    data: {
      code,
      name: data.name?.trim() || null,
      baseUrl: data.baseUrl.trim(),
    },
  })
}

export async function getUsageStatsByModel(days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)

  const rows = await prisma.usageLog.groupBy({
    by: ['model', 'status'],
    where: { createdAt: { gte: start } },
    _count: { id: true },
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      cost: true,
    },
  })

  return rows
}

/** 各模型近期成功率与平均延迟（用于状态页） */
export async function getModelLatencyStats(days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)

  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: start } },
    select: { model: true, status: true, latencyMs: true },
  })

  const byModel = new Map<
    string,
    { successCount: number; errorCount: number; latencySum: number; latencyCount: number }
  >()
  for (const log of logs) {
    const cur = byModel.get(log.model) ?? {
      successCount: 0,
      errorCount: 0,
      latencySum: 0,
      latencyCount: 0,
    }
    if (log.status === 'success') cur.successCount += 1
    else cur.errorCount += 1
    if (log.latencyMs != null) {
      cur.latencySum += log.latencyMs
      cur.latencyCount += 1
    }
    byModel.set(log.model, cur)
  }

  return Array.from(byModel.entries()).map(([model, v]) => ({
    model,
    successCount: v.successCount,
    errorCount: v.errorCount,
    avgLatencyMs: v.latencyCount > 0 ? Math.round(v.latencySum / v.latencyCount) : null,
    requestCount: v.successCount + v.errorCount,
  }))
}

export async function getUsageDailyByModel(days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)

  const logs = await prisma.usageLog.findMany({
    where: { createdAt: { gte: start } },
    select: {
      model: true,
      createdAt: true,
      totalTokens: true,
      cost: true,
    },
  })

  return logs
}

export async function getOverviewCounts() {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const [
    totalModels,
    enabledModels,
    totalProviders,
    todayUsage,
    sevenDaysUsage,
  ] = await Promise.all([
    prisma.modelPricing.count(),
    prisma.modelPricing.count({ where: { enabled: true } }),
    prisma.provider.count(),
    prisma.usageLog.aggregate({
      where: {
        createdAt: { gte: todayStart, lt: todayEnd },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
    prisma.usageLog.aggregate({
      where: {
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
      _sum: { cost: true },
    }),
  ])

  return {
    totalModels,
    enabledModels,
    totalProviders,
    totalRequestsToday: todayUsage._count.id,
    totalRequests7Days: sevenDaysUsage._count.id,
    totalCostToday: todayUsage._sum.cost?.toString() ?? '0',
    totalCost7Days: sevenDaysUsage._sum.cost?.toString() ?? '0',
  }
}

export async function updateModelPricing(
  modelName: string,
  data: { inputPrice?: number; outputPrice?: number; enabled?: boolean }
) {
  return prisma.modelPricing.update({
    where: { modelName },
    data: {
      ...(data.inputPrice !== undefined && { inputPrice: data.inputPrice }),
      ...(data.outputPrice !== undefined && { outputPrice: data.outputPrice }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  })
}

export async function renameModelPricing(oldModelName: string, newModelName: string) {
  const trimmedNew = newModelName.trim()
  if (!trimmedNew || trimmedNew === oldModelName) {
    throw new Error('新模型名无效或与当前相同')
  }
  const existing = await prisma.modelPricing.findUnique({
    where: { modelName: trimmedNew },
  })
  if (existing) {
    throw new Error('该模型名已存在')
  }
  return prisma.$transaction(async (tx) => {
    const oldRow = await tx.modelPricing.findUnique({
      where: { modelName: oldModelName },
    })
    if (!oldRow) {
      throw new Error('模型不存在')
    }
    await tx.modelPricing.create({
      data: {
        modelName: trimmedNew,
        providerId: oldRow.providerId,
        provider: oldRow.provider,
        inputPrice: oldRow.inputPrice,
        outputPrice: oldRow.outputPrice,
        inputCost: oldRow.inputCost,
        outputCost: oldRow.outputCost,
        baseUrl: oldRow.baseUrl,
        maxTokens: oldRow.maxTokens,
        description: oldRow.description,
        enabled: oldRow.enabled,
      },
    })
    await tx.usageLog.updateMany({
      where: { model: oldModelName },
      data: { model: trimmedNew },
    })
    await tx.modelPricing.delete({
      where: { modelName: oldModelName },
    })
  })
}
