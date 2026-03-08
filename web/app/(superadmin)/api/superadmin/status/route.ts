/**
 * 模型状态与响应时间
 * GET /api/superadmin/status?days=1
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchStatusOverview } from '@/app/(superadmin)/domain/superadmin.service'

export async function GET(request: NextRequest) {
  try {
    const days = Math.min(
      Math.max(parseInt(request.nextUrl.searchParams.get('days') || '1', 10), 1),
      30
    )
    const data = await fetchStatusOverview(days)
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Superadmin status error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '获取状态失败',
      },
      { status: 500 }
    )
  }
}
