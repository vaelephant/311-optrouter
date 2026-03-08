import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import {
  fetchUserApiKeys,
  createUserApiKey,
  deleteUserApiKey,
} from '@/app/(api-keys)/domain/api-key.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function POST(request: NextRequest) {
  const userId = getCurrentUserId(request)
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to create API keys', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  let body: { name?: string; rateLimitPerMin?: number } = {}
  try {
    body = await request.json()
  } catch {
  }

  try {
    const apiKey = await createUserApiKey({
      userId,
      name: body.name,
      rateLimitPerMin: body.rateLimitPerMin,
    })

    return NextResponse.json({
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
      rate_limit: apiKey.rate_limit,
      status: apiKey.status,
      created_at: apiKey.created_at,
      last_used_at: apiKey.last_used_at,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json(
      { error: { message: 'Failed to create API key', type: 'internal_error' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)
  
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to view API keys', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  try {
    const apiKeys = await fetchUserApiKeys(userId)
    return NextResponse.json({ data: apiKeys })
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch API keys', type: 'internal_error' } },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const userId = getCurrentUserId(request)
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to manage API keys', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  let body: { key_id: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { message: 'Missing key_id in request body', type: 'invalid_request_error' } },
      { status: 400 }
    )
  }

  try {
    await deleteUserApiKey(body.key_id, userId)
    return NextResponse.json({ success: true, message: 'API key revoked' })
  } catch (error: any) {
    if (error.message === 'API key not found') {
      return NextResponse.json(
        { error: { message: 'API key not found', type: 'not_found' } },
        { status: 404 }
      )
    }
    console.error('Failed to revoke API key:', error)
    return NextResponse.json(
      { error: { message: 'Failed to revoke API key', type: 'internal_error' } },
      { status: 500 }
    )
  }
}
