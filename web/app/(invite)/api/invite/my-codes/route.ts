/**
 * 获取我的邀请码列表 API Route
 * GET /api/invite/my-codes
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { getMyInviteCodes } from '@/app/(invite)/domain/invite.service'

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

    const inviteCodes = await getMyInviteCodes(userId)

    return NextResponse.json({
      success: true,
      invite_codes: inviteCodes,
    })
  } catch (error: any) {
    console.error('获取邀请码列表失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取邀请码列表失败' },
      { status: 500 }
    )
  }
}
