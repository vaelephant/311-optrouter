/**
 * 获取我的奖励记录 API Route
 * GET /api/invite/reward/my-rewards?status=pending|granted|expired
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { getMyRewards } from '@/app/(invite)/domain/invite.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request)

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, detail: '请先登录' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')

    let rewards = await getMyRewards(userId)

    if (status) {
      rewards = rewards.filter((r) => r.status === status)
    }

    return NextResponse.json({
      success: true,
      rewards,
    })
  } catch (error: any) {
    console.error('查询奖励记录失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '查询奖励记录失败' },
      { status: 500 }
    )
  }
}
