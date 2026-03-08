/**
 * 用户行为追踪 API Route
 * POST /api/user-behavior/track
 */
import { NextRequest, NextResponse } from 'next/server'
import { trackBehaviorEnter, trackBehaviorLeave } from '@/app/(dashboard)/domain/dashboard.service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id, email, function_name, action } = body

    if (!user_id || !email || !function_name || !action) {
      return NextResponse.json(
        { success: false, detail: '缺少必要参数' },
        { status: 400 }
      )
    }

    if (action !== 'enter' && action !== 'leave') {
      return NextResponse.json(
        { success: false, detail: 'action 必须是 enter 或 leave' },
        { status: 400 }
      )
    }

    if (action === 'enter') {
      const result = await trackBehaviorEnter({
        userId: user_id,
        email,
        functionName: function_name,
      })

      return NextResponse.json(result)
    } else {
      const result = await trackBehaviorLeave({
        userId: user_id,
        functionName: function_name,
      })

      if (!result.success) {
        return NextResponse.json(result, { status: 404 })
      }

      return NextResponse.json(result)
    }
  } catch (error: any) {
    console.error('行为追踪失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '行为追踪失败，请稍后重试' },
      { status: 500 }
    )
  }
}
