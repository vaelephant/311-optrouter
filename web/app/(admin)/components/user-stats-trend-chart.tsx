"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { format, isValid } from "date-fns"
import { cn } from "@/lib/utils"

interface DailyData {
  date: string
  login_users: number
  new_users: number
}

interface UserStatsTrendChartProps {
  data: DailyData[]
  loading?: boolean
  onRefresh?: () => void
}

function ChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    // 从 payload 的第一个数据点获取原始日期
    let formattedLabel = label
    if (payload[0]?.payload?.originalDate) {
      // 使用原始日期（YYYY-MM-DD 格式）
      const originalDate = payload[0].payload.originalDate
      if (typeof originalDate === 'string' && originalDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        formattedLabel = originalDate
      } else {
        const date = new Date(originalDate)
        if (isValid(date)) {
          formattedLabel = format(date, "yyyy-MM-dd")
        }
      }
    } else if (typeof label === 'string' && label.match(/^\d{2}-\d{2}$/)) {
      // 如果只有 MM-dd，尝试从当前年份构建完整日期
      const currentYear = new Date().getFullYear()
      const [month, day] = label.split('-')
      const date = new Date(currentYear, parseInt(month) - 1, parseInt(day))
      if (isValid(date)) {
        formattedLabel = format(date, "yyyy-MM-dd")
      }
    } else {
      // 尝试直接解析
      const date = new Date(label)
      if (isValid(date)) {
        formattedLabel = format(date, "yyyy-MM-dd")
      }
    }
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{formattedLabel}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function UserStatsTrendChart({
  data,
  loading,
  onRefresh,
}: UserStatsTrendChartProps) {
  // 格式化日期显示
  const chartData = data.map((item) => {
    // item.date 应该是 YYYY-MM-DD 格式的字符串
    let dateLabel = item.date
    if (typeof item.date === 'string' && item.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // 解析 YYYY-MM-DD 格式的日期字符串
      const [year, month, day] = item.date.split('-')
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      if (isValid(date)) {
        dateLabel = format(date, "MM-dd")
      }
    } else {
      // 尝试直接解析
      const date = new Date(item.date)
      if (isValid(date)) {
        dateLabel = format(date, "MM-dd")
      }
    }
    return {
      ...item,
      dateLabel,
      // 保留原始日期用于 tooltip
      originalDate: item.date,
    }
  })

  const maxValue = Math.max(
    ...chartData.map((d) => Math.max(d.login_users, d.new_users)),
    1
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium">登录数据统计</CardTitle>
            <CardDescription>用户登录行为分析与趋势</CardDescription>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              实时更新
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <p>暂无数据</p>
          </div>
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="fillLogin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="dateLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  domain={[0, maxValue * 1.1]}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="login_users"
                  name="登录用户"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#fillLogin)"
                />
                <Area
                  type="monotone"
                  dataKey="new_users"
                  name="新注册"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#fillNew)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
