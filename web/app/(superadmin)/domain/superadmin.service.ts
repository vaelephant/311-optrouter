/**
 * Superadmin 模块业务逻辑层
 * 模型信息、状态统计、供应商关联
 */
import {
  getModelPricingList,
  getProviderList,
  getUsageStatsByModel,
  getUsageDailyByModel,
  getOverviewCounts,
  updateModelPricing as repoUpdateModelPricing,
  renameModelPricing as repoRenameModelPricing,
  createProvider as repoCreateProvider,
  getModelLatencyStats as repoGetModelLatencyStats,
} from './superadmin.repo'
import type {
  SuperadminOverview,
  ModelPricingItem,
  ModelUsageStats,
  ModelDailyStats,
  ProviderItem,
  ModelsListResponse,
} from './superadmin.types'
import { getModelList, checkGatewayHealth, getHealthModels } from '@/lib/gateway'

function toModelPricingItem(row: Awaited<ReturnType<typeof getModelPricingList>>[number]): ModelPricingItem {
  return {
    id: row.id,
    modelName: row.modelName,
    providerId: row.providerId,
    providerCode: row.provider,
    providerName: row.providerRef?.name ?? null,
    inputPrice: row.inputPrice.toString(),
    outputPrice: row.outputPrice.toString(),
    inputCost: row.inputCost?.toString() ?? null,
    outputCost: row.outputCost?.toString() ?? null,
    baseUrl: row.baseUrl,
    maxTokens: row.maxTokens,
    description: row.description,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function fetchSuperadminOverview(): Promise<SuperadminOverview> {
  const counts = await getOverviewCounts()
  return {
    totalModels: counts.totalModels,
    enabledModels: counts.enabledModels,
    totalProviders: counts.totalProviders,
    totalRequestsToday: counts.totalRequestsToday,
    totalRequests7Days: counts.totalRequests7Days,
    totalCostToday: counts.totalCostToday,
    totalCost7Days: counts.totalCost7Days,
  }
}

export async function fetchModelsList(): Promise<ModelsListResponse> {
  const [pricingRows, gatewayResult, usageRows] = await Promise.all([
    getModelPricingList(),
    getModelList(),
    getUsageStatsByModel(30),
  ])

  const pricing = pricingRows.map(toModelPricingItem)

  const gatewayModels = 'models' in gatewayResult ? gatewayResult.models : []

  const usageByModel = new Map<string, ModelUsageStats>()
  for (const row of usageRows) {
    const existing = usageByModel.get(row.model) ?? {
      model: row.model,
      requestCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: '0',
      successCount: 0,
      errorCount: 0,
      rateLimitedCount: 0,
    }
    existing.requestCount += row._count.id
    existing.totalInputTokens += row._sum.inputTokens ?? 0
    existing.totalOutputTokens += row._sum.outputTokens ?? 0
    existing.totalTokens += row._sum.totalTokens ?? 0
    const cost = Number(existing.totalCost) + Number(row._sum.cost ?? 0)
    existing.totalCost = cost.toString()
    if (row.status === 'success') existing.successCount += row._count.id
    else if (row.status === 'error') existing.errorCount += row._count.id
    else if (row.status === 'rate_limited') existing.rateLimitedCount += row._count.id
    usageByModel.set(row.model, existing)
  }
  const usageStats = Array.from(usageByModel.values()).sort(
    (a, b) => b.requestCount - a.requestCount
  )

  return { pricing, gatewayModels, usageStats }
}

export async function fetchModelStats(days: number): Promise<{
  byModel: ModelUsageStats[]
  daily: ModelDailyStats[]
}> {
  const [usageRows, dailyLogs] = await Promise.all([
    getUsageStatsByModel(days),
    getUsageDailyByModel(days),
  ])

  const usageByModel = new Map<string, ModelUsageStats>()
  for (const row of usageRows) {
    const existing = usageByModel.get(row.model) ?? {
      model: row.model,
      requestCount: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalCost: '0',
      successCount: 0,
      errorCount: 0,
      rateLimitedCount: 0,
    }
    existing.requestCount += row._count.id
    existing.totalInputTokens += row._sum.inputTokens ?? 0
    existing.totalOutputTokens += row._sum.outputTokens ?? 0
    existing.totalTokens += row._sum.totalTokens ?? 0
    const cost = Number(existing.totalCost) + Number(row._sum.cost ?? 0)
    existing.totalCost = cost.toString()
    if (row.status === 'success') existing.successCount += row._count.id
    else if (row.status === 'error') existing.errorCount += row._count.id
    else if (row.status === 'rate_limited') existing.rateLimitedCount += row._count.id
    usageByModel.set(row.model, existing)
  }
  const byModel = Array.from(usageByModel.values()).sort(
    (a, b) => b.requestCount - a.requestCount
  )

  const dailyMap = new Map<string, { requestCount: number; totalTokens: number; totalCost: number }>()
  for (const log of dailyLogs) {
    const date = log.createdAt.toISOString().slice(0, 10)
    const key = `${date}\t${log.model}`
    const cur = dailyMap.get(key) ?? {
      requestCount: 0,
      totalTokens: 0,
      totalCost: 0,
    }
    cur.requestCount += 1
    cur.totalTokens += log.totalTokens
    cur.totalCost += Number(log.cost)
    dailyMap.set(key, cur)
  }
  const daily: ModelDailyStats[] = Array.from(dailyMap.entries()).map(([k, v]) => {
    const [date, model] = k.split('\t')
    return {
      date,
      model,
      requestCount: v.requestCount,
      totalTokens: v.totalTokens,
      totalCost: v.totalCost.toString(),
    }
  })
  daily.sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : a.model.localeCompare(b.model)))

  return { byModel, daily }
}

export async function fetchProvidersList(): Promise<ProviderItem[]> {
  const rows = await getProviderList()
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    baseUrl: r.baseUrl,
    modelCount: r._count.modelPricings,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))
}

export async function updateModelPricing(
  modelName: string,
  data: { inputPrice?: number; outputPrice?: number; enabled?: boolean }
) {
  return repoUpdateModelPricing(modelName, data)
}

export async function renameModelPricing(oldModelName: string, newModelName: string) {
  return repoRenameModelPricing(oldModelName, newModelName)
}

export async function createProvider(data: {
  code: string
  name?: string | null
  baseUrl: string
}) {
  return repoCreateProvider(data)
}

export type ModelStatusItem = {
  model: string
  status: 'ok' | 'fail' | 'unknown'
  avgLatencyMs: number | null
  requestCount: number
  successCount: number
  errorCount: number
  /** 来自 gateway GET /health/models 的实时可访问性 */
  gatewayReachable?: boolean
  /** 来自 gateway 探测的响应时间（ms） */
  gatewayLatencyMs?: number
}

export type StatusOverview = {
  gateway: { status: 'healthy' | 'unhealthy'; latencyMs?: number; error?: string }
  gatewayModels: string[]
  modelStats: ModelStatusItem[]
}

export async function fetchStatusOverview(days: number = 1): Promise<StatusOverview> {
  const [gatewayResult, modelListResult, latencyRows, healthModelsResult] = await Promise.all([
    checkGatewayHealth(),
    getModelList(),
    repoGetModelLatencyStats(days),
    getHealthModels(),
  ])
  const gatewayModels = 'models' in modelListResult ? modelListResult.models : []
  const gatewayHealthByModel = new Map<string, { reachable: boolean; latencyMs: number }>()
  if ('models' in healthModelsResult && Array.isArray(healthModelsResult.models)) {
    for (const m of healthModelsResult.models) {
      gatewayHealthByModel.set(m.model, {
        reachable: m.status === 'ok',
        latencyMs: m.latency_ms ?? 0,
      })
    }
  }
  const statsByModel = new Map<string, ModelStatusItem>()
  for (const r of latencyRows) {
    const gw = gatewayHealthByModel.get(r.model)
    statsByModel.set(r.model, {
      model: r.model,
      status: r.requestCount === 0 ? 'unknown' : r.successCount > 0 ? 'ok' : 'fail',
      avgLatencyMs: r.avgLatencyMs,
      requestCount: r.requestCount,
      successCount: r.successCount,
      errorCount: r.errorCount,
      gatewayReachable: gw?.reachable,
      gatewayLatencyMs: gw?.latencyMs,
    })
  }
  for (const m of gatewayModels) {
    if (!statsByModel.has(m)) {
      const gw = gatewayHealthByModel.get(m)
      statsByModel.set(m, {
        model: m,
        status: 'unknown',
        avgLatencyMs: null,
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        gatewayReachable: gw?.reachable,
        gatewayLatencyMs: gw?.latencyMs,
      })
    } else {
      const cur = statsByModel.get(m)!
      const gw = gatewayHealthByModel.get(m)
      cur.gatewayReachable = gw?.reachable
      cur.gatewayLatencyMs = gw?.latencyMs
      statsByModel.set(m, cur)
    }
  }
  const modelStats = Array.from(statsByModel.values()).sort((a, b) => a.model.localeCompare(b.model))
  return {
    gateway: {
      status: gatewayResult.status === 'healthy' ? 'healthy' : 'unhealthy',
      latencyMs: gatewayResult.latencyMs,
      error: gatewayResult.error,
    },
    gatewayModels,
    modelStats,
  }
}
