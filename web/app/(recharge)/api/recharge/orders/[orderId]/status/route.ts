import { NextRequest, NextResponse } from 'next/server'
import { checkPaymentStatusService } from '../../../../../domain/recharge.service'

/**
 * 前端轮询支付状态接口
 * GET /api/recharge/orders/{orderId}/status
 *
 * 后端主动调用支付网关查询最新状态，并在支付成功时完成入账
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: '缺少订单 ID' },
        { status: 400 }
      )
    }

    const result = await checkPaymentStatusService(orderId)

    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    console.error('查询支付状态异常:', error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : '查询失败',
      },
      { status: 500 }
    )
  }
}
