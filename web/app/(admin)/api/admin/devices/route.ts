/**
 * 设备统计 API Route
 * GET /api/admin/devices?days=7
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchDeviceStats } from '@/app/(admin)/domain/admin.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7', 10)

    const stats = await fetchDeviceStats(days)

    return NextResponse.json(stats)
  } catch (error: any) {
    console.error('获取设备统计失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取设备统计失败' },
      { status: 500 }
    )
  }
}
