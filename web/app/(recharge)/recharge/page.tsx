"use client"

import { useState } from "react"
import { DashboardLayout } from "../../(dashboard)/components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"
import { RechargeForm } from "../components/recharge-form"
import { PaymentQrcode } from "../components/payment-qrcode"

export default function RechargePage() {
  const [order, setOrder] = useState<{
    orderId: string
    bizOrderNo: string
    qrcodeUrl: string
    amount: number
    payProvider: 'WECHAT' | 'ALIPAY'
  } | null>(null)

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold mb-1">账户充值</h1>
            <p className="text-xs text-muted-foreground">
              充值余额用于支付 AI 调用费用
            </p>
          </div>

          {order ? (
            <PaymentQrcode
              order={order}
              onClose={() => setOrder(null)}
            />
          ) : (
            <RechargeForm
              onOrderCreated={(newOrder) => setOrder(newOrder)}
            />
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
