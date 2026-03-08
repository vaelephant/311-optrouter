/**
 * API 密钥模块数据访问层
 */
import { prisma } from '@/lib/db'

/**
 * 获取用户的 API Keys
 */
export async function getUserApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      rateLimitPerMin: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })
}

/**
 * 查找 API Key（用于验证是否存在）
 */
export async function findApiKeyById(keyId: string, userId: string) {
  return prisma.apiKey.findFirst({
    where: { id: keyId, userId },
  })
}
