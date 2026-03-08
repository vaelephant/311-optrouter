/**
 * 仪表板模块数据访问层
 */
import { prisma } from '@/lib/db'
import type { UsageStatsParams, ActivityLog } from './dashboard.types'

/**
 * 获取使用统计
 */
export async function getUsageStats(params: UsageStatsParams) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - params.days)

  const whereClause: Record<string, unknown> = {
    userId: params.userId,
    createdAt: {
      gte: startDate,
    },
  }

  if (params.model) {
    whereClause.model = params.model
  }

  const usageLogs = await prisma.usageLog.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  })

  return usageLogs
}

/**
 * 获取活动日志
 */
export async function getActivityLogs(userId: string, limit: number = 20) {
  return prisma.usageLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      model: true,
      inputTokens: true,
      outputTokens: true,
      cost: true,
      status: true,
      createdAt: true,
      latencyMs: true,
    },
  })
}

/**
 * 创建行为记录（进入功能）
 */
export async function createBehaviorLog(data: {
  userId: string
  email: string
  functionName: string
  startTime: Date
}) {
  return prisma.userBehaviorLog.create({
    data: {
      userId: data.userId,
      email: data.email,
      functionName: data.functionName,
      startTime: data.startTime,
    },
  })
}

/**
 * 查找最近的行为记录（用于离开功能）
 */
export async function findLastBehaviorLog(userId: string, functionName: string) {
  return prisma.userBehaviorLog.findFirst({
    where: {
      userId,
      functionName,
      endTime: null,
    },
    orderBy: {
      startTime: 'desc',
    },
  })
}

/**
 * 更新行为记录（离开功能）
 */
export async function updateBehaviorLog(
  id: number,
  data: {
    endTime: Date
    durationSeconds: number
  }
) {
  return prisma.userBehaviorLog.update({
    where: { id },
    data: {
      endTime: data.endTime,
      durationSeconds: data.durationSeconds,
    },
  })
}

/**
 * 获取用户当前订阅信息
 */
export async function getUserSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: 'active',
    },
    include: {
      plan: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

/**
 * 获取用户余额
 */
export async function getUserBalance(userId: string) {
  const balance = await prisma.userBalance.findUnique({
    where: { userId },
  })
  return balance?.balance || 0
}

/**
 * 获取用户当前周期的使用费用（从当前周期开始到现在的总费用）
 */
export async function getCurrentPeriodUsage(userId: string, periodStart: Date) {
  const result = await prisma.usageLog.aggregate({
    where: {
      userId,
      createdAt: {
        gte: periodStart,
      },
    },
    _sum: {
      cost: true,
    },
  })
  return Number(result._sum.cost || 0)
}
