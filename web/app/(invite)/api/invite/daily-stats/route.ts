/**
 * 获取每日邀请统计 API Route
 * GET /api/invite/daily-stats?days=7
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchDailyInviteStats } from '@/app/(invite)/domain/invite.service'

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
    const days = parseInt(searchParams.get('days') || '7', 10)

    const dailyStats = await fetchDailyInviteStats(userId, days)

    return NextResponse.json({
      success: true,
      daily_stats: dailyStats,
    })
  } catch (error: any) {
    console.error('获取每日邀请统计失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取每日邀请统计失败' },
      { status: 500 }
    )
  }
}
