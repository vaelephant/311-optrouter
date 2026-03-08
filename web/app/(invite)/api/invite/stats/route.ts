/**
 * 获取邀请统计 API Route（个人）
 * GET /api/invite/stats
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchInviteStats } from '@/app/(invite)/domain/invite.service'

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

    const stats = await fetchInviteStats(userId)

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    console.error('获取邀请统计失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取邀请统计失败' },
      { status: 500 }
    )
  }
}
