/**
 * 统计摘要 API Route
 * GET /api/admin/summary
 */
import { NextResponse } from 'next/server'
import { fetchAdminSummary } from '@/app/(admin)/domain/admin.service'

export async function GET() {
  try {
    const data = await fetchAdminSummary()

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error: any) {
    console.error('获取统计摘要失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取统计摘要失败' },
      { status: 500 }
    )
  }
}
