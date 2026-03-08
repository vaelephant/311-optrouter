/**
 * 充值模块 Zod 校验 Schema
 */
import { z } from 'zod'
import { RECHARGE_AMOUNTS } from './recharge.types'

/**
 * 创建充值订单参数校验
 */
export const createRechargeOrderSchema = z.object({
  amount: z
    .number()
    .min(RECHARGE_AMOUNTS.MIN, `最小充值金额为 ${RECHARGE_AMOUNTS.MIN} 元`)
    .max(RECHARGE_AMOUNTS.MAX, `最大充值金额为 ${RECHARGE_AMOUNTS.MAX} 元`)
    .positive('充值金额必须大于 0'),
  payProvider: z.enum(['WECHAT', 'ALIPAY'], {
    errorMap: () => ({ message: '支付渠道必须是 WECHAT 或 ALIPAY' }),
  }),
})

/**
 * 支付回调数据校验
 */
export const paymentNotifySchema = z.object({
  biz_order_no: z.string().min(1, '业务订单号不能为空'),
  gateway_order_no: z.string().min(1, '网关订单号不能为空'),
  status: z.string().min(1, '订单状态不能为空'),
  amount: z.number().positive('订单金额必须大于 0'),
  sign: z.string().min(1, '签名不能为空'),
})
