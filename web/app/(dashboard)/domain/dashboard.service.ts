/**
 * 仪表板模块业务逻辑层
 */
import {
  getUsageStats,
  getActivityLogs,
  createBehaviorLog,
  findLastBehaviorLog,
  updateBehaviorLog,
  getUserSubscription,
  getUserBalance,
  getCurrentPeriodUsage,
} from './dashboard.repo'
import type { UsageStatsParams, UsageStats, ActivityLog, PlanInfo } from './dashboard.types'

/**
 * 格式化时间差为中文
 */
function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins} 分钟前`
  } else if (diffHours < 24) {
    return `${diffHours} 小时前`
  } else if (diffDays < 7) {
    return `${diffDays} 天前`
  } else {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }
}

/**
 * 获取使用统计
 */
export async function fetchUsageStats(params: UsageStatsParams): Promise<UsageStats> {
  const usageLogs = await getUsageStats(params)

  // 调试日志：检查查询到的数据
  console.log(`[fetchUsageStats] userId=${params.userId}, days=${params.days}, found ${usageLogs.length} logs`)
  if (usageLogs.length > 0) {
    console.log(`[fetchUsageStats] sample log:`, {
      id: usageLogs[0].id,
      model: usageLogs[0].model,
      inputTokens: usageLogs[0].inputTokens,
      outputTokens: usageLogs[0].outputTokens,
      cost: usageLogs[0].cost,
      createdAt: usageLogs[0].createdAt,
    })
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - params.days)

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCost = 0
  let latencySum = 0
  let latencyCount = 0
  let successCount = 0
  const modelBreakdown: Record<string, { tokens: number; cost: number; requests: number }> = {}

  for (const log of usageLogs) {
    totalInputTokens += log.inputTokens
    totalOutputTokens += log.outputTokens
    totalCost += Number(log.cost)

    if (log.status === 'success') {
      successCount += 1
    }
    if (typeof log.latencyMs === 'number') {
      latencySum += log.latencyMs
      latencyCount += 1
    }

    const modelKey = log.model
    if (!modelBreakdown[modelKey]) {
      modelBreakdown[modelKey] = {
        tokens: 0,
        cost: 0,
        requests: 0,
      }
    }
    modelBreakdown[modelKey].tokens += log.inputTokens + log.outputTokens
    modelBreakdown[modelKey].cost += Number(log.cost)
    modelBreakdown[modelKey].requests += 1
  }

  const dailyUsage: Record<string, { tokens: number; cost: number; requests: number }> = {}
  for (const log of usageLogs) {
    const dateKey = log.createdAt.toISOString().split('T')[0]
    if (!dailyUsage[dateKey]) {
      dailyUsage[dateKey] = { tokens: 0, cost: 0, requests: 0 }
    }
    dailyUsage[dateKey].tokens += log.inputTokens + log.outputTokens
    dailyUsage[dateKey].cost += Number(log.cost)
    dailyUsage[dateKey].requests += 1
  }

  return {
    period: {
      days: params.days,
      start_date: startDate.toISOString(),
      end_date: new Date().toISOString(),
    },
    summary: {
      total_requests: usageLogs.length,
      total_input_tokens: totalInputTokens,
      total_output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens,
      total_cost: totalCost,
      avg_latency_ms: latencyCount > 0 ? Math.round(latencySum / latencyCount) : 0,
      // success_rate: 0~100（百分比）
      success_rate: usageLogs.length > 0 ? (successCount / usageLogs.length) * 100 : 0,
    },
    model_breakdown: modelBreakdown,
    daily_usage: dailyUsage,
  }
}

/**
 * 获取活动日志
 */
export async function fetchActivityLogs(userId: string, limit: number = 20): Promise<ActivityLog[]> {
  const usageLogs = await getActivityLogs(userId, limit)

  return usageLogs.map((log) => {
    const totalTokens = log.inputTokens + log.outputTokens
    const latency = log.latencyMs ? `${log.latencyMs}ms` : '—'

    // 确定请求类型（根据模型名称推断，或默认为 chat.completions）
    let requestType = 'chat.completions'
    if (log.model.toLowerCase().includes('embed')) {
      requestType = 'embeddings'
    }

    return {
      id: String(log.id), // 将 BigInt 转换为字符串，避免 JSON 序列化错误
      model: log.model,
      type: requestType,
      status: log.status.toLowerCase() as 'success' | 'error' | 'rate_limited',
      tokens: totalTokens,
      latency: latency,
      time: formatTimeAgo(log.createdAt),
    }
  })
}

/**
 * 追踪用户行为（进入功能）
 */
export async function trackBehaviorEnter(params: {
  userId: string
  email: string
  functionName: string
}) {
  await createBehaviorLog({
    userId: params.userId,
    email: params.email,
    functionName: params.functionName,
    startTime: new Date(),
  })

  return {
    success: true,
    message: '行为记录已创建',
  }
}

/**
 * 追踪用户行为（离开功能）
 */
export async function trackBehaviorLeave(params: {
  userId: string
  functionName: string
}) {
  const lastBehavior = await findLastBehaviorLog(params.userId, params.functionName)

  if (!lastBehavior) {
    return {
      success: false,
      detail: '未找到对应的进入记录',
    }
  }

  const endTime = new Date()
  const durationSeconds = (endTime.getTime() - lastBehavior.startTime.getTime()) / 1000

  await updateBehaviorLog(lastBehavior.id, {
    endTime,
    durationSeconds,
  })

  return {
    success: true,
    message: '行为记录已更新',
    duration_seconds: durationSeconds,
  }
}

/**
 * 获取用户方案信息
 */
export async function fetchUserPlanInfo(userId: string): Promise<PlanInfo> {
  const subscription = await getUserSubscription(userId)
  const balance = await getUserBalance(userId)
  
  // 如果没有订阅，返回默认值
  if (!subscription) {
    return {
      planName: '免费',
      usedAmount: 0,
      totalAmount: 0,
      balance: Number(balance),
    }
  }

  // 计算当前周期的使用费用
  // 如果订阅有 currentPeriodEnd，从当前周期开始计算
  // 否则从订阅创建时间开始计算
  const periodStart = subscription.currentPeriodEnd 
    ? new Date(subscription.currentPeriodEnd.getTime() - 30 * 24 * 60 * 60 * 1000) // 假设是月付，往前推30天
    : subscription.createdAt
  
  const usedAmount = await getCurrentPeriodUsage(userId, periodStart)
  const totalAmount = Number(subscription.plan.monthlyPrice)

  return {
    planName: subscription.plan.name,
    usedAmount,
    totalAmount,
    balance: Number(balance),
  }
}
