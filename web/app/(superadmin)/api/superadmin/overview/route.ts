/**
 * Superadmin 概览 API
 * GET /api/superadmin/overview
 */
import { NextResponse } from 'next/server'
import { fetchSuperadminOverview } from '@/app/(superadmin)/domain/superadmin.service'

export async function GET() {
  try {
    const data = await fetchSuperadminOverview()
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Superadmin overview error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '获取概览失败',
      },
      { status: 500 }
    )
  }
}
