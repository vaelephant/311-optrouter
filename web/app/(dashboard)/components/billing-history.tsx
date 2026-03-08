"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowDownCircle, ArrowUpCircle } from "lucide-react"
import { getCurrentUserId } from "@/lib/auth-client"

interface RechargeOrder {
  id: string
  bizOrderNo: string
  amount: number
  payProvider: string
  status: string
  createdAt: string
  paidAt: string | null
}

interface Transaction {
  id: string
  amount: number
  type: string
  description: string | null
  createdAt: string
}

interface BillingData {
  balance: number
  rechargeOrders: RechargeOrder[]
  transactions: Transaction[]
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid:     { label: '已完成', variant: 'default' },
  pending:  { label: '待支付', variant: 'secondary' },
  failed:   { label: '失败',   variant: 'destructive' },
  canceled: { label: '已取消', variant: 'outline' },
}

const PROVIDER_MAP: Record<string, string> = {
  WECHAT: '微信支付',
  ALIPAY: '支付宝',
}

const TYPE_MAP: Record<string, string> = {
  recharge:   '充值',
  usage:      '调用扣费',
  refund:     '退款',
  adjustment: '余额调整',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export function BillingHistory() {
  const [data, setData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userId = getCurrentUserId()
    if (!userId) { setLoading(false); return }

    fetch('/api/recharge/history', {
      headers: { 'x-user-id': userId },
    })
      .then((r) => r.json())
      .then((json) => { if (json.ok) setData(json.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 余额卡片 */}
      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">当前余额</p>
            <p className="text-3xl font-bold">
              ¥{(data?.balance ?? 0).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 记录 Tabs */}
      <Tabs defaultValue="recharge">
        <TabsList>
          <TabsTrigger value="recharge">
            充值记录
            {data && data.rechargeOrders.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {data.rechargeOrders.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions">
            收支流水
            {data && data.transactions.length > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">
                {data.transactions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* 充值记录 */}
        <TabsContent value="recharge" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                充值记录（最近 50 条）
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!data || data.rechargeOrders.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无充值记录
                </div>
              ) : (
                <div className="divide-y">
                  {data.rechargeOrders.map((order) => {
                    const status = STATUS_MAP[order.status] ?? { label: order.status, variant: 'outline' as const }
                    return (
                      <div key={order.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <ArrowDownCircle className="h-5 w-5 text-green-500 shrink-0" />
                          <div>
                            <p className="text-sm font-medium">
                              {PROVIDER_MAP[order.payProvider] ?? order.payProvider}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {order.bizOrderNo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(order.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-base font-semibold text-green-600">
                            +¥{order.amount.toFixed(2)}
                          </p>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 收支流水 */}
        <TabsContent value="transactions" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                收支流水（最近 50 条）
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!data || data.transactions.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  暂无流水记录
                </div>
              ) : (
                <div className="divide-y">
                  {data.transactions.map((tx) => {
                    const isIncome = tx.amount > 0
                    return (
                      <div key={tx.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isIncome ? (
                            <ArrowDownCircle className="h-5 w-5 text-green-500 shrink-0" />
                          ) : (
                            <ArrowUpCircle className="h-5 w-5 text-orange-500 shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {TYPE_MAP[tx.type] ?? tx.type}
                            </p>
                            {tx.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {tx.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(tx.createdAt)}
                            </p>
                          </div>
                        </div>
                        <p className={`text-base font-semibold ${isIncome ? 'text-green-600' : 'text-orange-600'}`}>
                          {isIncome ? '+' : ''}¥{tx.amount.toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
