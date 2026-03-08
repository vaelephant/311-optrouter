/**
 * API 密钥模块类型定义
 */

export interface ApiKey {
  id: string
  masked_key: string
  status: string
  quota_limit: number
  quota_used: number
  created_at: string
  expires_at: string | null
}

export interface CreateApiKeyParams {
  userId: string
  name?: string
  rateLimitPerMin?: number
}

export interface CreateApiKeyResult {
  id: string
  key: string
  name: string | null
  rate_limit: number
  status: string
  created_at: string
  last_used_at: string | null
}
