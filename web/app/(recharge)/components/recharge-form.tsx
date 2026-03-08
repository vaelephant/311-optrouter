"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RECHARGE_AMOUNTS } from "../domain/recharge.types"
import { createRechargeOrderAction } from "../actions"
import { getCurrentUserId } from "@/lib/auth-client"
import { toast } from "sonner"

interface RechargeFormProps {
  onOrderCreated: (order: {
    orderId: string
    bizOrderNo: string
    qrcodeUrl: string
    amount: number
    payProvider: 'WECHAT' | 'ALIPAY'
  }) => void
}

export function RechargeForm({ onOrderCreated }: RechargeFormProps) {
  const [amount, setAmount] = useState<number | null>(null)
  const [customAmount, setCustomAmount] = useState("")
  const [payProvider, setPayProvider] = useState<'WECHAT' | 'ALIPAY'>('WECHAT')
  const [loading, setLoading] = useState(false)

  const handlePresetAmount = (preset: number) => {
    setAmount(preset)
    setCustomAmount("")
  }

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value)
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      setAmount(num)
    } else {
      setAmount(null)
    }
  }

  const handleSubmit = async () => {
    if (!amount || amount < RECHARGE_AMOUNTS.MIN || amount > RECHARGE_AMOUNTS.MAX) {
      toast.error(`充值金额必须在 ${RECHARGE_AMOUNTS.MIN} - ${RECHARGE_AMOUNTS.MAX} 元之间`)
      return
    }

    const userId = getCurrentUserId()
    if (!userId) {
      toast.error('请先登录')
      return
    }

    setLoading(true)

    try {
      const formData = new FormData()
      formData.append('amount', amount.toString())
      formData.append('payProvider', payProvider)
      formData.append('userId', userId)

      const result = await createRechargeOrderAction(null, formData)

      if (result.ok && result.data) {
        onOrderCreated(result.data)
        toast.success('订单创建成功，请扫码支付')
      } else {
        toast.error(result.error || '创建订单失败')
      }
    } catch (error) {
      console.error('创建订单异常:', error)
      toast.error('创建订单失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>账户充值</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 金额选择 */}
        <div className="space-y-3">
          <Label>充值金额</Label>
          <div className="grid grid-cols-3 gap-3">
            {RECHARGE_AMOUNTS.PRESET.map((preset) => (
              <Button
                key={preset}
                variant={amount === preset ? "default" : "outline"}
                onClick={() => handlePresetAmount(preset)}
                className="h-12"
              >
                ¥{preset}
              </Button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="custom-amount">自定义金额</Label>
            <Input
              id="custom-amount"
              type="number"
              placeholder={`请输入 ${RECHARGE_AMOUNTS.MIN} - ${RECHARGE_AMOUNTS.MAX} 元`}
              value={customAmount}
              onChange={(e) => handleCustomAmount(e.target.value)}
              min={RECHARGE_AMOUNTS.MIN}
              max={RECHARGE_AMOUNTS.MAX}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              最小 {RECHARGE_AMOUNTS.MIN} 元，最大 {RECHARGE_AMOUNTS.MAX} 元
            </p>
          </div>
        </div>

        {/* 支付方式 */}
        <div className="space-y-3">
          <Label>支付方式</Label>
          <RadioGroup value={payProvider} onValueChange={(v) => setPayProvider(v as 'WECHAT' | 'ALIPAY')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="WECHAT" id="wechat" />
              <Label htmlFor="wechat" className="cursor-pointer">
                微信支付
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ALIPAY" id="alipay" />
              <Label htmlFor="alipay" className="cursor-pointer">
                支付宝
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* 提交按钮 */}
        <Button
          onClick={handleSubmit}
          disabled={!amount || loading}
          className="w-full"
          size="lg"
        >
          {loading ? "创建订单中..." : `确认充值 ¥${amount?.toFixed(2) || '0.00'}`}
        </Button>
      </CardContent>
    </Card>
  )
}
