/**
 * Superadmin 模块类型定义
 * 模型信息、状态统计、供应商关联
 */

export interface ModelPricingItem {
  id: number
  modelName: string
  providerId: number | null
  providerCode: string
  providerName: string | null
  inputPrice: string
  outputPrice: string
  inputCost: string | null
  outputCost: string | null
  baseUrl: string | null
  maxTokens: number | null
  description: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ModelUsageStats {
  model: string
  requestCount: number
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  totalCost: string
  successCount: number
  errorCount: number
  rateLimitedCount: number
}

export interface ModelDailyStats {
  date: string
  model: string
  requestCount: number
  totalTokens: number
  totalCost: string
}

export interface SuperadminOverview {
  totalModels: number
  enabledModels: number
  totalProviders: number
  totalRequestsToday: number
  totalRequests7Days: number
  totalCostToday: string
  totalCost7Days: string
}

export interface ProviderItem {
  id: number
  code: string
  name: string | null
  baseUrl: string
  modelCount: number
  createdAt: string
  updatedAt: string
}

export interface ModelsListResponse {
  pricing: ModelPricingItem[]
  gatewayModels: string[]
  usageStats: ModelUsageStats[]
}
