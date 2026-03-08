import { NextRequest, NextResponse } from 'next/server'
import { handlePaymentNotify } from '../../../domain/recharge.service'
import { paymentNotifySchema } from '../../../domain/recharge.schema'

/**
 * 支付回调接口
 * POST /api/recharge/notify
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod 校验
    const validation = paymentNotifySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { ok: false, error: validation.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }

    // 处理支付通知
    const result = await handlePaymentNotify(body)

    if (result.ok) {
      // 返回成功（网关会重试，必须返回 200）
      return NextResponse.json({ ok: true }, { status: 200 })
    } else {
      // 返回错误（网关会重试）
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 200 } // 即使错误也返回 200，避免网关重复通知
      )
    }
  } catch (error) {
    console.error('支付回调处理异常:', error)
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : '处理异常' },
      { status: 200 }
    )
  }
}
