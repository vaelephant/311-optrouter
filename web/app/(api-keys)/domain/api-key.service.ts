/**
 * API 密钥模块业务逻辑层
 */
import { getUserApiKeys, findApiKeyById } from './api-key.repo'
import { createApiKey, revokeApiKey } from '@/lib/auth'
import type { CreateApiKeyParams, CreateApiKeyResult, ApiKey } from './api-key.types'

/**
 * 获取用户的 API Keys 列表
 */
export async function fetchUserApiKeys(userId: string): Promise<ApiKey[]> {
  const apiKeys = await getUserApiKeys(userId)

  return apiKeys.map(key => ({
    id: key.id,
    masked_key: `sk-${key.id.slice(0, 8)}...`,
    status: key.status,
    quota_limit: key.rateLimitPerMin * 60 * 24 * 30, // 转换为月度配额（每分钟 * 60 * 24 * 30）
    quota_used: 0, // TODO: 从 usage_logs 表统计实际使用量
    created_at: key.createdAt.toISOString(),
    expires_at: null, // TODO: 如果 API Key 有过期时间，从这里返回
  }))
}

/**
 * 创建 API Key
 */
export async function createUserApiKey(
  params: CreateApiKeyParams
): Promise<CreateApiKeyResult> {
  const apiKey = await createApiKey(
    params.userId,
    params.name,
    params.rateLimitPerMin
  )

  return {
    id: apiKey.id,
    key: apiKey.key,
    name: apiKey.name,
    rate_limit: apiKey.rateLimitPerMin,
    status: apiKey.status,
    created_at: apiKey.createdAt.toISOString(),
    last_used_at: apiKey.lastUsedAt?.toISOString() || null,
  }
}

/**
 * 删除 API Key
 */
export async function deleteUserApiKey(keyId: string, userId: string): Promise<void> {
  const existingKey = await findApiKeyById(keyId, userId)

  if (!existingKey) {
    throw new Error('API key not found')
  }

  await revokeApiKey(keyId)
}
