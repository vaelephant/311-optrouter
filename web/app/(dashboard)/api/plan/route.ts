import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchUserPlanInfo } from '@/app/(dashboard)/domain/dashboard.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)

  // 验证用户ID
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json(
      { error: { message: 'Please login to view plan info', type: 'authentication_error' } },
      { status: 401 }
    )
  }

  try {
    const planInfo = await fetchUserPlanInfo(userId)
    return NextResponse.json({ data: planInfo })
  } catch (error) {
    console.error('Failed to fetch plan info:', error)
    return NextResponse.json(
      { error: { message: 'Failed to fetch plan info', type: 'internal_error' } },
      { status: 500 }
    )
  }
}
