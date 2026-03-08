/**
 * Superadmin 模型列表 API（含定价与用量统计）
 * GET /api/superadmin/models
 */
import { NextResponse } from 'next/server'
import { fetchModelsList } from '@/app/(superadmin)/domain/superadmin.service'

export async function GET() {
  try {
    const data = await fetchModelsList()
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Superadmin models list error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '获取模型列表失败',
      },
      { status: 500 }
    )
  }
}
