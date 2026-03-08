import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'
import crypto from 'crypto'

export interface AuthResult {
  valid: boolean
  userId?: string
  apiKeyId?: string
  quotaLimit?: number
  quotaUsed?: number
  error?: string
  statusCode?: number
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }
    return authHeader
  }

  const apiKeyHeader = request.headers.get('x-api-key')
  if (apiKeyHeader) {
    return apiKeyHeader
  }

  return null
}

export async function verifyApiKey(request: NextRequest): Promise<AuthResult> {
  const apiKey = extractApiKey(request)
  if (!apiKey) {
    return {
      valid: false,
      error: 'Missing API key',
      statusCode: 401,
    }
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      valid: false,
      error: 'Invalid API key format',
      statusCode: 401,
    }
  }

  const keyHash = hashKey(apiKey)

  const keyRecord = await prisma.apiKey.findFirst({
    where: { keyHash },
    include: { user: true },
  })

  if (!keyRecord) {
    return {
      valid: false,
      error: 'Invalid API key',
      statusCode: 401,
    }
  }

  if (keyRecord.status !== 'active') {
    return {
      valid: false,
      error: `API key is ${keyRecord.status}`,
      statusCode: 403,
    }
  }

  return {
    valid: true,
    userId: keyRecord.userId,
    apiKeyId: keyRecord.id,
    quotaLimit: keyRecord.rateLimitPerMin,
    quotaUsed: 0,
  }
}

export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  return verifyApiKey(request)
}

export function generateApiKey(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 15)
  return `sk-${timestamp}-${random}`
}

export async function createApiKey(
  userId: string,
  name?: string,
  rateLimitPerMin: number = 60
) {
  const key = generateApiKey()
  const keyHash = hashKey(key)
  
  const apiKey = await prisma.apiKey.create({
    data: {
      userId,
      keyHash,
      name,
      rateLimitPerMin,
      status: 'active',
    },
  })

  return {
    ...apiKey,
    key,
  }
}

export async function revokeApiKey(keyId: string) {
  return prisma.apiKey.update({
    where: { id: keyId },
    data: { status: 'disabled' },
  })
}

export async function updateLastUsed(keyId: string) {
  return prisma.apiKey.update({
    where: { id: keyId },
    data: { lastUsedAt: new Date() },
  })
}
