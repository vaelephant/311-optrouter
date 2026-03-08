/**
 * 用户行为统计 API Route
 * GET /api/admin/behavior?days=7
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchBehaviorStats } from '@/app/(admin)/domain/admin.service'

export async function GET(request: NextRequest) {
  try {
    const daysParam = parseInt(request.nextUrl.searchParams.get('days') || '7', 10)
    const days = Number.isNaN(daysParam) || daysParam <= 0 ? 7 : Math.min(daysParam, 90)

    const stats = await fetchBehaviorStats(days)

    return NextResponse.json({
      success: true,
      ...stats,
    })
  } catch (error: any) {
    console.error('获取用户行为统计失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取用户行为统计失败' },
      { status: 500 }
    )
  }
}
