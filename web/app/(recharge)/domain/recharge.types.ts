/**
 * 充值模块类型定义
 */

export interface RechargeOrder {
  id: string
  userId: string
  bizOrderNo: string
  gatewayOrderNo: string | null
  amount: number
  payProvider: 'WECHAT' | 'ALIPAY'
  status: 'pending' | 'paid' | 'failed' | 'canceled'
  qrcodeUrl: string | null
  processed: boolean
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
}

export interface CreateRechargeOrderParams {
  userId: string
  amount: number
  payProvider: 'WECHAT' | 'ALIPAY'
}

export interface CreateRechargeOrderResult {
  orderId: string
  bizOrderNo: string
  qrcodeUrl: string
  amount: number
  payProvider: 'WECHAT' | 'ALIPAY'
}

export interface PaymentNotifyData {
  biz_order_no: string
  gateway_order_no: string
  status: string
  amount: number
  sign: string
  [key: string]: any
}

// 充值金额配置
export const RECHARGE_AMOUNTS = {
  MIN: 1,      // 最小充值金额（元）
  MAX: 10000,  // 最大充值金额（元）
  PRESET: [10, 50, 100], // 固定档位（元）
} as const
