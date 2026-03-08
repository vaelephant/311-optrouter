/**
 * 生成邀请码 API Route
 * POST /api/invite/generate
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { generateInviteCode } from '@/app/(invite)/domain/invite.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function POST(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request)

    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, detail: '请先登录' },
        { status: 401 }
      )
    }

    const body = await request.json()
    // 默认无限次（999999 表示无限次）
    const { max_uses = 999999, expires_at } = body

    const inviteCode = await generateInviteCode(userId, max_uses, expires_at || null)

    return NextResponse.json({
      success: true,
      invite_code: inviteCode,
    })
  } catch (error: any) {
    console.error('生成邀请码失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '生成邀请码失败' },
      { status: 500 }
    )
  }
}
