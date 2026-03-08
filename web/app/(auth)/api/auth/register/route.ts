/**
 * 用户注册 API Route
 * POST /api/auth/register
 */
import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/app/(auth)/domain/auth.service'
import { handleInviteCodeOnRegister } from '@/app/(invite)/domain/invite.service'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password, invite_code } = body

  const result = await registerUser(
    { email, password, inviteCode: invite_code },
    async (userId: string, userEmail: string, inviteCode: string) => {
      await handleInviteCodeOnRegister({
        newUserId: userId,
        newUserEmail: userEmail,
        inviteCodeStr: inviteCode,
      })
    }
  )

  if (!result.success) {
    const status = result.detail.includes('已注册') ? 400 : 
                   result.detail.includes('格式') || result.detail.includes('长度') ? 400 : 500
    return NextResponse.json(result, { status })
  }

  // 返回时统一使用 user_id 字段（兼容前端）
  return NextResponse.json({
    ...result,
    user_id: result.userId, // 添加 user_id 字段
  })
}
