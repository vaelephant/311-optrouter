/**
 * 获取我邀请的用户列表 API Route
 * GET /api/invite/my-invites
 */
import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { getMyInvites } from '@/app/(invite)/domain/invite.service'

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

    const invites = await getMyInvites(userId)

    // 添加调试日志
    console.log('[my-invites] userId:', userId)
    console.log('[my-invites] invites count:', invites.length)
    if (invites.length > 0) {
      console.log('[my-invites] first invite:', JSON.stringify(invites[0], null, 2))
    }

    return NextResponse.json({
      success: true,
      invites,
      total: invites.length,
    })
  } catch (error: any) {
    console.error('获取邀请用户列表失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '获取邀请用户列表失败' },
      { status: 500 }
    )
  }
}
