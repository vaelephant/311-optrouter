/**
 * 检查并发放奖励 API Route
 * POST /api/invite/reward/check
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { checkAndGrantRewards } from '@/app/(invite)/domain/invite.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request)

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, detail: '请先登录' },
        { status: 401 }
      )
    }

    const result = await checkAndGrantRewards(userId)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('检查并发放奖励失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '检查并发放奖励失败' },
      { status: 500 }
    )
  }
}
