/**
 * Superadmin 供应商列表 API
 * GET /api/superadmin/providers
 * POST /api/superadmin/providers  body: { code, name?, baseUrl }
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchProvidersList, createProvider } from '@/app/(superadmin)/domain/superadmin.service'

export async function GET() {
  try {
    const data = await fetchProvidersList()
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Superadmin providers error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '获取供应商列表失败',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    const name = typeof body.name === 'string' ? body.name.trim() || null : null
    const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl.trim() : ''
    if (!code || !baseUrl) {
      return NextResponse.json(
        { success: false, detail: '请提供 code 和 baseUrl' },
        { status: 400 }
      )
    }
    const provider = await createProvider({ code, name, baseUrl })
    return NextResponse.json({
      success: true,
      data: {
        id: provider.id,
        code: provider.code,
        name: provider.name,
        baseUrl: provider.baseUrl,
        modelCount: 0,
        createdAt: provider.createdAt.toISOString(),
        updatedAt: provider.updatedAt.toISOString(),
      },
    })
  } catch (error: unknown) {
    console.error('Superadmin provider create error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '添加供应商失败',
      },
      { status: 500 }
    )
  }
}
