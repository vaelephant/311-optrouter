import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { prisma } from '@/lib/db'

function getCurrentUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id')
}

/**
 * 获取用户充值记录 & 收支流水
 * GET /api/recharge/history
 */
export async function GET(request: NextRequest) {
  const userId = getCurrentUserId(request)

  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const [balance, rechargeOrders, transactions] = await Promise.all([
      // 当前余额
      prisma.userBalance.findUnique({
        where: { userId },
        select: { balance: true, updatedAt: true },
      }),
      // 充值记录（最近 50 条）
      prisma.rechargeOrder.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          bizOrderNo: true,
          amount: true,
          payProvider: true,
          status: true,
          createdAt: true,
          paidAt: true,
        },
      }),
      // 收支流水（最近 50 条）
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          amount: true,
          type: true,
          description: true,
          createdAt: true,
        },
      }),
    ])

    return NextResponse.json({
      ok: true,
      data: {
        balance: balance ? Number(balance.balance) : 0,
        rechargeOrders: rechargeOrders.map((o) => ({
          ...o,
          amount: Number(o.amount),
        })),
        transactions: transactions.map((t) => ({
          ...t,
          id: t.id.toString(),
          amount: Number(t.amount),
        })),
      },
    })
  } catch (error) {
    console.error('获取账单数据失败:', error)
    return NextResponse.json({ ok: false, error: '获取数据失败' }, { status: 500 })
  }
}
