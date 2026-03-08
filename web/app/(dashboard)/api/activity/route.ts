import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchActivityLogs } from '@/app/(dashboard)/domain/dashboard.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)

  // 验证用户ID
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to view activity', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  try {
    const activities = await fetchActivityLogs(userId, 20)
    return NextResponse.json({ data: activities })
  } catch (error) {
    console.error('Failed to fetch activity logs:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch activity logs', type: 'internal_error' } },
      { status: 500 }
    )
  }
}
