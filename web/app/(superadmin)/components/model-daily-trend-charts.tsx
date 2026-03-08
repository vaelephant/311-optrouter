"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import { format } from "date-fns"
import type { ModelDailyStats } from "@/app/(superadmin)/domain/superadmin.types"

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(250 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
]

interface ModelDailyTrendChartsProps {
  daily: ModelDailyStats[]
  loading?: boolean
}

function getTopModelsByRequest(daily: ModelDailyStats[], n: number): string[] {
  const sum = new Map<string, number>()
  for (const d of daily) {
    sum.set(d.model, (sum.get(d.model) ?? 0) + d.requestCount)
  }
  return [...sum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([m]) => m)
}

function getTopModelsByCost(daily: ModelDailyStats[], n: number): string[] {
  const sum = new Map<string, number>()
  for (const d of daily) {
    const c = Number(d.totalCost)
    if (c > 0) sum.set(d.model, (sum.get(d.model) ?? 0) + c)
  }
  return [...sum.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([m]) => m)
}

function buildChartData(
  daily: ModelDailyStats[],
  topModels: string[],
  valueKey: "requestCount" | "totalCost"
): { data: Record<string, string | number>[]; keys: string[] } {
  const dates = [...new Set(daily.map((d) => d.date))].sort()
  const keys = topModels.map((_, i) => `m${i}`)
  const data = dates.map((date) => {
    const row: Record<string, string | number> = { date }
    topModels.forEach((model, i) => {
      const r = daily.find((d) => d.date === date && d.model === model)
      const k = `m${i}`
      if (valueKey === "totalCost") {
        row[k] = r ? Number(r.totalCost) : 0
      } else {
        row[k] = r?.requestCount ?? 0
      }
    })
    return row
  })
  return { data, keys }
}

export function ModelDailyTrendCharts({ daily, loading }: ModelDailyTrendChartsProps) {
  const { requestConfig, requestData, requestKeys, costConfig, costData, costKeys } = useMemo(() => {
    const topByRequest = getTopModelsByRequest(daily, 8)
    const topByCost = getTopModelsByCost(daily, 8)
    const { data: reqData, keys: reqKeys } = buildChartData(daily, topByRequest, "requestCount")
    const { data: costD, keys: costK } = buildChartData(daily, topByCost, "totalCost")
    const requestConfig: ChartConfig = {
      date: { label: "日期" },
      ...Object.fromEntries(
        reqKeys.map((k, i) => [
          k,
          {
            label: (topByRequest[i].length > 14
              ? topByRequest[i].slice(0, 12) + "…"
              : topByRequest[i]),
            color: CHART_COLORS[i % CHART_COLORS.length],
          },
        ])
      ),
    }
    const costConfig: ChartConfig = {
      date: { label: "日期" },
      ...Object.fromEntries(
        costK.map((k, i) => [
          k,
          {
            label: (topByCost[i].length > 14
              ? topByCost[i].slice(0, 12) + "…"
              : topByCost[i]),
            color: CHART_COLORS[i % CHART_COLORS.length],
          },
        ])
      ),
    }
    return {
      requestConfig,
      requestData: reqData.map((r) => ({
        ...r,
        dateLabel: format(new Date(r.date as string), "MM-dd"),
      })),
      requestKeys: reqKeys,
      costConfig,
      costData: costD.map((r) => ({
        ...r,
        dateLabel: format(new Date(r.date as string), "MM-dd"),
      })),
      costKeys: costK,
    }
  }, [daily])

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日请求量趋势（近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">每日费用趋势（近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasRequest = requestData.length > 0 && requestKeys.length > 0
  const hasCost = costData.length > 0 && costKeys.length > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">每日请求量趋势（近30天）</CardTitle>
          <p className="text-xs text-muted-foreground">Top 8 模型按日请求数</p>
        </CardHeader>
        <CardContent>
          {!hasRequest ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ChartContainer config={requestConfig} className="h-[280px] w-full">
              <AreaChart
                data={requestData}
                margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date ?? ""
                      }
                    />
                  }
                />
                <Legend />
                {requestKeys.map((dataKey) => (
                  <Area
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={`var(--color-${dataKey})`}
                    fill={`var(--color-${dataKey})`}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">每日费用趋势（近30天）</CardTitle>
          <p className="text-xs text-muted-foreground">Top 8 模型按日费用</p>
        </CardHeader>
        <CardContent>
          {!hasCost ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              暂无数据
            </div>
          ) : (
            <ChartContainer config={costConfig} className="h-[280px] w-full">
              <AreaChart
                data={costData}
                margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1 ? v.toFixed(0) : v.toFixed(2)
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date ?? ""
                      }
                      formatter={(value) => [
                        Number(value).toFixed(4),
                        undefined,
                      ]}
                    />
                  }
                />
                <Legend />
                {costKeys.map((dataKey) => (
                  <Area
                    key={dataKey}
                    type="monotone"
                    dataKey={dataKey}
                    stroke={`var(--color-${dataKey})`}
                    fill={`var(--color-${dataKey})`}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
