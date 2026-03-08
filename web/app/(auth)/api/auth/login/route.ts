/**
 * 用户登录 API Route
 * POST /api/auth/login
 */
import { NextRequest, NextResponse } from 'next/server'
import { loginUser } from '@/app/(auth)/domain/auth.service'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { email, password } = body

  const result = await loginUser({ email, password }, request.headers)

  if (!result.success) {
    const detail = (result.detail || '').toLowerCase()
    // 数据库连接类错误不要误报 401（否则前端会以为账号密码错了）
    const isDbError =
      detail.includes('timeout') ||
      detail.includes('terminated') ||
      detail.includes('econn') ||
      detail.includes('database_url') ||
      detail.includes('prisma')

    return NextResponse.json(result, { status: isDbError ? 500 : 401 })
  }

  // 兼容前端字段命名（user_id）
  return NextResponse.json({
    success: true,
    message: result.message,
    token: result.token,
    user_id: result.userId,
    email: result.email,
  })
}
