"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis } from "recharts"
import type { ModelUsageStats } from "@/app/(superadmin)/domain/superadmin.types"

const chartConfig = {
  requestCount: {
    label: "请求数",
    color: "var(--chart-1)",
  },
  totalCost: {
    label: "费用",
    color: "var(--chart-2)",
  },
  model: {
    label: "模型",
  },
} satisfies ChartConfig

interface ModelBarChartsProps {
  usageStats: ModelUsageStats[]
  loading?: boolean
}

export function ModelBarCharts({ usageStats, loading }: ModelBarChartsProps) {
  const topByRequests = [...usageStats]
    .sort((a, b) => b.requestCount - a.requestCount)
    .slice(0, 12)
  const topByCost = [...usageStats]
    .filter((u) => Number(u.totalCost) > 0)
    .sort((a, b) => Number(b.totalCost) - Number(a.totalCost))
    .slice(0, 12)

  const requestData = topByRequests.map((u) => ({
    model: u.model.length > 16 ? u.model.slice(0, 14) + "…" : u.model,
    requestCount: u.requestCount,
  }))
  const costData = topByCost.map((u) => ({
    model: u.model.length > 16 ? u.model.slice(0, 14) + "…" : u.model,
    totalCost: Number(u.totalCost),
  }))

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各模型请求量（近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">各模型费用（近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">各模型请求量（近30天）</CardTitle>
          <p className="text-xs text-muted-foreground">Top 12 按请求数</p>
        </CardHeader>
        <CardContent>
          {requestData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={requestData} margin={{ left: 12, right: 12 }}>
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="requestCount"
                  fill="var(--color-requestCount)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">各模型费用（近30天）</CardTitle>
          <p className="text-xs text-muted-foreground">Top 12 按费用</p>
        </CardHeader>
        <CardContent>
          {costData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <BarChart data={costData} margin={{ left: 12, right: 12 }}>
                <XAxis
                  dataKey="model"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (v >= 1 ? v.toFixed(0) : v.toFixed(2))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [Number(value).toFixed(4), "费用"]}
                    />
                  }
                />
                <Bar
                  dataKey="totalCost"
                  fill="var(--color-totalCost)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
