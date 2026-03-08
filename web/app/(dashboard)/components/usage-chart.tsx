"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useState, useEffect } from "react"
import { getCurrentUserId } from "@/lib/auth-client"

interface DailyData {
  date: string
  tokens: number
  requests: number
  cost: number
}

const defaultData: DailyData[] = []

interface TooltipPayload {
  value: number
  dataKey: string
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-medium text-popover-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-xs text-muted-foreground">
          {p.dataKey === "requests"
            ? `请求: ${p.value.toLocaleString()}`
            : p.dataKey === "tokens"
            ? `Token: ${(p.value / 1000000).toFixed(2)}M`
            : `费用: $${p.value.toFixed(2)}`}
        </p>
      ))}
    </div>
  )
}

export function UsageChart() {
  const [metric, setMetric] = useState<"requests" | "tokens" | "cost">("requests")
  const [data, setData] = useState<DailyData[]>(defaultData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const userId = getCurrentUserId()
      if (!userId) {
        setData([])
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/usage?days=30', {
          headers: { 'x-user-id': userId },
        })
        
        if (!response.ok) {
          console.error('Usage chart API error:', response.status, response.statusText)
          setData([])
          setLoading(false)
          return
        }
        
        const result = await response.json()
        
        // 调试日志：检查 API 返回的数据
        console.log('[UsageChart] API response:', {
          summary: result.summary,
          daily_usage_keys: result.daily_usage ? Object.keys(result.daily_usage) : [],
          daily_usage_sample: result.daily_usage ? Object.entries(result.daily_usage)[0] : null,
        })
        
        if (result.error) {
          console.error('Usage chart API returned error:', result.error)
          setData([])
          setLoading(false)
          return
        }

        if (result.daily_usage) {
          const chartData: DailyData[] = Object.entries(result.daily_usage)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, d]) => ({
              date: date.slice(5),
              requests: (d as { requests: number }).requests,
              tokens: (d as { tokens: number }).tokens,
              cost: (d as { cost: number }).cost,
            }))
          setData(chartData)
        } else {
          setData([])
        }
      } catch (error) {
        console.error('Failed to fetch usage data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const formatY = (v: number) => {
    if (metric === "requests") {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
      if (v >= 1000) return `${(v / 1000).toFixed(0)}K`
      return String(v)
    }
    if (metric === "tokens") {
      if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`
      if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
      return String(v)
    }
    // 费用：如果小于 0.01，显示更多小数位；否则显示 2 位小数
    if (v < 0.01 && v > 0) return `$${v.toFixed(4)}`
    return `$${v.toFixed(2)}`
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">
          API 使用量趋势
        </CardTitle>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as typeof metric)}>
          <TabsList className="h-7 bg-secondary">
            <TabsTrigger value="requests" className="text-[11px] h-5 px-2.5">请求数</TabsTrigger>
            <TabsTrigger value="tokens" className="text-[11px] h-5 px-2.5">Token</TabsTrigger>
            <TabsTrigger value="cost" className="text-[11px] h-5 px-2.5">费用</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.2 250)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="oklch(0.65 0.2 250)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.26 0.008 260)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.01 260)" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "oklch(0.6 0.01 260)" }}
                  tickFormatter={formatY}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke="oklch(0.65 0.2 250)"
                  strokeWidth={2}
                  fill="url(#fillPrimary)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
