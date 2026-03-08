"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, X, CheckCircle2, Clock } from "lucide-react"
import QRCode from "react-qr-code"
import { toast } from "sonner"

/** 倒计时总秒数：10 分钟 */
const COUNTDOWN_SECONDS = 10 * 60
/** 轮询间隔：3 秒 */
const POLL_INTERVAL_MS = 3000

interface PaymentQrcodeProps {
  order: {
    orderId: string
    bizOrderNo: string
    qrcodeUrl: string
    amount: number
    payProvider: 'WECHAT' | 'ALIPAY'
  }
  onClose: () => void
}

export function PaymentQrcode({ order, onClose }: PaymentQrcodeProps) {
  const router = useRouter()
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS)
  const [paid, setPaid] = useState(false)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 跳转回 dashboard
  const goToDashboard = (reason: 'paid' | 'timeout') => {
    stopTimers()
    if (reason === 'paid') {
      toast.success('充值成功！余额已到账')
    } else {
      toast.info('支付超时，已自动返回首页')
    }
    router.push('/dashboard')
  }

  const stopTimers = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
  }

  // 轮询支付状态
  const pollStatus = async () => {
    try {
      const res = await fetch(`/api/recharge/orders/${order.orderId}/status`)
      if (!res.ok) return
      const json = await res.json()
      if (json.ok && json.data?.paid) {
        setPaid(true)
        setTimeout(() => goToDashboard('paid'), 1500) // 给用户看一下成功状态再跳转
      }
    } catch {
      // 网络错误，忽略，等下次轮询
    }
  }

  useEffect(() => {
    // 启动倒计时
    countdownTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          goToDashboard('timeout')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // 立即查一次，再每 3 秒查
    pollStatus()
    pollTimerRef.current = setInterval(pollStatus, POLL_INTERVAL_MS)

    return () => stopTimers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.orderId])

  // 格式化剩余时间 mm:ss
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const seconds = String(secondsLeft % 60).padStart(2, '0')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>扫码支付</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            订单号：{order.bizOrderNo}
          </p>
          <p className="text-2xl font-bold">
            支付金额：¥{order.amount.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            请使用{order.payProvider === 'WECHAT' ? '微信' : '支付宝'}扫码支付
          </p>
        </div>

        {/* 二维码区域 */}
        <div className="flex justify-center p-4 bg-muted rounded-lg relative">
          {order.qrcodeUrl ? (
            <div className="bg-white p-3 rounded">
              <QRCode value={order.qrcodeUrl} size={220} />
            </div>
          ) : (
            <div className="w-64 h-64 flex items-center justify-center border-2 border-dashed rounded">
              <QrCode className="h-16 w-16 text-muted-foreground" />
            </div>
          )}

          {/* 支付成功遮罩 */}
          {paid && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 rounded-lg gap-2">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <p className="text-base font-semibold text-green-600">支付成功！</p>
              <p className="text-sm text-muted-foreground">正在跳转…</p>
            </div>
          )}
        </div>

        <div className="text-center space-y-2">
          {/* 倒计时 */}
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              请在{' '}
              <span className={secondsLeft <= 60 ? 'text-destructive font-semibold' : 'font-semibold'}>
                {minutes}:{seconds}
              </span>{' '}
              内完成支付，超时将自动返回
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            支付完成后，余额将自动到账
          </p>
          <Button variant="outline" onClick={onClose} className="w-full">
            取消支付
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
