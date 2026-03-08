/**
 * 仪表板模块类型定义
 */

export interface UsageStatsParams {
  userId: string
  days: number
  model?: string
}

export interface UsageStats {
  period: {
    days: number
    start_date: string
    end_date: string
  }
  summary: {
    total_requests: number
    total_input_tokens: number
    total_output_tokens: number
    total_tokens: number
    total_cost: number
    avg_latency_ms: number
    success_rate: number
  }
  model_breakdown: Record<string, {
    tokens: number
    cost: number
    requests: number
  }>
  daily_usage: Record<string, {
    tokens: number
    cost: number
    requests: number
  }>
}

export interface ActivityLog {
  id: string
  model: string
  type: string
  status: 'success' | 'error' | 'rate_limited'
  tokens: number
  latency: string
  time: string
}

export interface PlanInfo {
  planName: string
  usedAmount: number
  totalAmount: number
  balance: number
}
