import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchUsageStats } from '@/app/(dashboard)/domain/dashboard.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)
  const searchParams = request.nextUrl.searchParams
  const days = parseInt(searchParams.get('days') || '30', 10)
  const model = searchParams.get('model') || undefined

  if (days < 1 || days > 365) {
    return NextResponse.json(
      { error: { message: 'Invalid days parameter', type: 'invalid_request_error' } },
      { status: 400 }
    )
  }

  // 验证用户ID
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to view usage statistics', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  try {
    const stats = await fetchUsageStats({ userId, days, model })
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch usage stats:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch usage stats', type: 'internal_error' } },
      { status: 500 }
    )
  }
}
