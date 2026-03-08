/**
 * 充值模块业务逻辑层
 */
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import {
  createRechargeOrder,
  findRechargeOrderById,
  findRechargeOrderByBizOrderNo,
  updateRechargeOrderStatus,
} from './recharge.repo'
import { getPaymentGatewayClient } from '@/lib/payment-gateway/client'
import { verifyNotifySign } from '@/lib/payment-gateway/notify-signature'
import { prisma } from '@/lib/db'
import { grantInviteRechargeReward } from '@/app/(invite)/domain/invite.service'
import type {
  CreateRechargeOrderParams,
  CreateRechargeOrderResult,
  PaymentNotifyData,
} from './recharge.types'

/**
 * 生成业务订单号
 */
function generateBizOrderNo(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `RECHARGE_${timestamp}_${random}`
}

/**
 * 创建充值订单
 */
export async function createRechargeOrderService(
  params: CreateRechargeOrderParams
): Promise<CreateRechargeOrderResult> {
  const { userId, amount, payProvider } = params

  // 生成业务订单号
  const bizOrderNo = generateBizOrderNo()

  // 调用支付网关创建订单
  const client = getPaymentGatewayClient()
  const { getPaymentGatewayAppId } = await import('@/lib/payment-gateway/client')
  const notifyUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/recharge/notify`
  const appId = getPaymentGatewayAppId() // 如果配置了 APP_ID，则传递

  let gatewayResponse
  try {
    gatewayResponse = await client.createPayOrder({
      bizOrderNo,
      amount,
      payProvider,
      payMethod: 'NATIVE', // 扫码支付
      title: `账户充值 - ¥${amount}`,
      notifyUrl,
      appId, // 如果配置了，则传递 app_id
      // 注意：appRefId 应该由支付网关服务端从 app 字段自动关联获取，不需要客户端传递
      meta: null, // 明确设置为 null，避免类型错误
    })
  } catch (error) {
    console.error('调用支付网关创建订单失败:', {
      bizOrderNo,
      amount,
      payProvider,
      notifyUrl,
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error(`创建支付订单失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }

  // 保存订单到数据库
  const order = await createRechargeOrder({
    userId,
    bizOrderNo,
    amount: new Prisma.Decimal(amount),
    payProvider,
    qrcodeUrl: gatewayResponse.qrcode_url || null,
    gatewayOrderNo: gatewayResponse.gateway_order_no || null,
  })

  return {
    orderId: order.id,
    bizOrderNo: order.bizOrderNo,
    qrcodeUrl: gatewayResponse.qrcode_url || '',
    amount,
    payProvider,
  }
}

/**
 * 内部：执行支付成功入账逻辑（带幂等保护）
 * 同时被 handlePaymentNotify 和 checkPaymentStatusService 调用
 */
async function processPaymentSuccess(
  orderId: string,
  gatewayOrderNo?: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // 幂等检查（防止 notify 和轮询并发重复处理）
    const latestOrder = await tx.rechargeOrder.findUnique({ where: { id: orderId } })
    if (!latestOrder || latestOrder.processed) return

    await tx.rechargeOrder.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        processed: true,
        paidAt: new Date(),
        ...(gatewayOrderNo ? { gatewayOrderNo } : {}),
      },
    })

    await tx.userBalance.upsert({
      where: { userId: latestOrder.userId },
      create: {
        userId: latestOrder.userId,
        balance: new Prisma.Decimal(0),
      },
      update: {},
    })

    await tx.userBalance.update({
      where: { userId: latestOrder.userId },
      data: {
        balance: { increment: latestOrder.amount },
        updatedAt: new Date(),
      },
    })

    await tx.transaction.create({
      data: {
        userId: latestOrder.userId,
        amount: latestOrder.amount,
        type: 'recharge',
        description: `充值订单 ${latestOrder.bizOrderNo}`,
      },
    })

    await tx.$executeRaw`
      SELECT pg_notify('user_balance_changed', 
        json_build_object('user_id', ${latestOrder.userId}::text, 'balance', 
          (SELECT balance::text FROM user_balances WHERE user_id = ${latestOrder.userId})
        )::text
      )
    `

    // 邀请奖励：被邀请人首次充值时，给邀请人加余额（仅发一次）
    await grantInviteRechargeReward(latestOrder.userId, tx)
  })
}

/**
 * 主动查询支付状态（前端轮询使用）
 * 调用支付网关 API 获取最新状态，如果已支付则执行入账逻辑
 */
export async function checkPaymentStatusService(
  orderId: string
): Promise<{ status: string; paid: boolean }> {
  const order = await findRechargeOrderById(orderId)
  if (!order) {
    throw new Error('订单不存在')
  }

  // 已终态，直接返回
  if (order.status === 'paid') {
    return { status: 'paid', paid: true }
  }
  if (order.status === 'failed' || order.status === 'canceled') {
    return { status: order.status, paid: false }
  }

  // 没有网关订单号，无法查询（订单刚创建，稍后重试）
  if (!order.gatewayOrderNo) {
    return { status: 'pending', paid: false }
  }

  // 主动向支付网关查询
  const client = getPaymentGatewayClient()
  let gatewayResult: any
  try {
    gatewayResult = await client.queryPayOrder(order.gatewayOrderNo)
  } catch (error) {
    console.error('主动查询支付网关失败:', error)
    // 查询失败不影响前端继续轮询，返回当前本地状态
    return { status: 'pending', paid: false }
  }

  // 网关返回的 status 字段（兼容直接字段或 data 包裹两种结构）
  const gatewayStatus: string =
    gatewayResult?.status ?? gatewayResult?.data?.status ?? ''

  if (gatewayStatus === 'SUCCESS') {
    await processPaymentSuccess(order.id, order.gatewayOrderNo)
    return { status: 'paid', paid: true }
  }

  if (gatewayStatus === 'FAILED' || gatewayStatus === 'CLOSED') {
    await updateRechargeOrderStatus(order.id, {
      status: 'failed',
      processed: true,
    })
    return { status: 'failed', paid: false }
  }

  return { status: 'pending', paid: false }
}

/**
 * 处理支付回调通知
 */
export async function handlePaymentNotify(
  notifyData: PaymentNotifyData
): Promise<{ ok: boolean; error?: string }> {
  try {
    // 1. 验证签名
    const apiSecret = process.env.PAYMENT_GATEWAY_API_SECRET
    if (!apiSecret) {
      return { ok: false, error: '支付网关配置缺失' }
    }

    const receivedSign = notifyData.sign
    if (!receivedSign) {
      return { ok: false, error: '缺少签名' }
    }

    // 提取签名外的数据
    const dataWithoutSign = { ...notifyData }
    delete dataWithoutSign.sign

    try {
      verifyNotifySign(apiSecret, dataWithoutSign, receivedSign)
    } catch (error) {
      return { ok: false, error: `签名验证失败: ${error instanceof Error ? error.message : 'unknown'}` }
    }

    // 2. 查找订单
    const { biz_order_no, gateway_order_no, status, amount } = notifyData
    const order = await findRechargeOrderByBizOrderNo(biz_order_no)

    if (!order) {
      return { ok: false, error: '订单不存在' }
    }

    // 3. 幂等检查
    if (order.processed) {
      // 已处理，直接返回成功（幂等）
      return { ok: true }
    }

    // 4. 验证订单状态和金额
    if (order.status !== 'pending') {
      return { ok: false, error: `订单状态异常: ${order.status}` }
    }

    const orderAmount = Number(order.amount)
    if (Math.abs(orderAmount - amount) > 0.01) {
      // 允许 0.01 的误差（浮点数精度问题）
      return { ok: false, error: `订单金额不匹配: 期望 ${orderAmount}, 实际 ${amount}` }
    }

    // 5. 处理支付成功
    if (status === 'SUCCESS') {
      await processPaymentSuccess(order.id, gateway_order_no)
      return { ok: true }
    } else {
      // 支付失败或其他状态，只更新订单状态
      await updateRechargeOrderStatus(order.id, {
        status: status === 'FAILED' ? 'failed' : 'canceled',
        processed: true,
        gatewayOrderNo: gateway_order_no,
      })

      return { ok: true, error: `支付状态: ${status}` }
    }
  } catch (error) {
    console.error('处理支付通知异常:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : '处理支付通知异常',
    }
  }
}
