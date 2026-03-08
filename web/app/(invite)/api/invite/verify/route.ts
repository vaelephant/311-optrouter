/**
 * 验证邀请码 API Route
 * GET /api/invite/verify?code=XXXX
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyInviteCode } from '@/app/(invite)/domain/invite.service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json(
        { success: false, detail: '请输入邀请码' },
        { status: 400 }
      )
    }

    const result = await verifyInviteCode(code)

    if (!result.success || !result.valid) {
      const status = result.detail?.includes('不存在') ? 404 : 400
      return NextResponse.json(result, { status })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('验证邀请码失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '验证邀请码失败' },
      { status: 500 }
    )
  }
}
