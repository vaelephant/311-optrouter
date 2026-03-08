/**
 * 充值模块数据访问层
 */
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/**
 * 创建充值订单
 */
export async function createRechargeOrder(data: {
  userId: string
  bizOrderNo: string
  amount: Prisma.Decimal
  payProvider: string
  qrcodeUrl?: string | null
  gatewayOrderNo?: string | null
}) {
  return prisma.rechargeOrder.create({
    data: {
      userId: data.userId,
      bizOrderNo: data.bizOrderNo,
      amount: data.amount,
      payProvider: data.payProvider,
      qrcodeUrl: data.qrcodeUrl || null,
      gatewayOrderNo: data.gatewayOrderNo || null,
      status: 'pending',
      processed: false,
    },
  })
}

/**
 * 根据订单 ID 查找订单
 */
export async function findRechargeOrderById(id: string) {
  return prisma.rechargeOrder.findUnique({
    where: { id },
  })
}

/**
 * 根据业务订单号查找订单
 */
export async function findRechargeOrderByBizOrderNo(bizOrderNo: string) {
  return prisma.rechargeOrder.findUnique({
    where: { bizOrderNo },
  })
}

/**
 * 根据网关订单号查找订单
 */
export async function findRechargeOrderByGatewayOrderNo(gatewayOrderNo: string) {
  return prisma.rechargeOrder.findFirst({
    where: { gatewayOrderNo },
  })
}

/**
 * 更新订单状态
 */
export async function updateRechargeOrderStatus(
  orderId: string,
  data: {
    status?: 'pending' | 'paid' | 'failed' | 'canceled'
    processed?: boolean
    paidAt?: Date | null
    gatewayOrderNo?: string | null
  }
) {
  return prisma.rechargeOrder.update({
    where: { id: orderId },
    data,
  })
}

/**
 * 获取用户的充值订单列表
 */
export async function getUserRechargeOrders(
  userId: string,
  options?: {
    page?: number
    pageSize?: number
  }
) {
  const page = options?.page || 1
  const pageSize = options?.pageSize || 20
  const skip = (page - 1) * pageSize

  const [orders, total] = await Promise.all([
    prisma.rechargeOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.rechargeOrder.count({
      where: { userId },
    }),
  ])

  return {
    orders,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}
