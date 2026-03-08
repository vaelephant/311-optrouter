"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import type { ModelUsageStats, ModelDailyStats } from "@/app/(superadmin)/domain/superadmin.types"

interface ModelStatsChartProps {
  days?: number
}

export function ModelStatsChart({ days: initialDays = 7 }: ModelStatsChartProps) {
  const [days, setDays] = useState(initialDays)
  const [byModel, setByModel] = useState<ModelUsageStats[]>([])
  const [daily, setDaily] = useState<ModelDailyStats[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/superadmin/models/stats?days=${days}`)
      const json = await res.json()
      if (json.success && json.data) {
        setByModel(json.data.byModel ?? [])
        setDaily(json.data.daily ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [days])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型用量统计（近{days}天）</CardTitle>
          <CardContent className="pt-0">
            <div className="h-48 animate-pulse rounded bg-muted" />
          </CardContent>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">模型用量统计（近{days}天）</CardTitle>
        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "outline"}
              size="sm"
              onClick={() => setDays(d)}
            >
              {d}天
            </Button>
          ))}
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-medium mb-2">按模型汇总</h4>
          <div className="overflow-x-auto rounded border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型</TableHead>
                  <TableHead>请求数</TableHead>
                  <TableHead>总 Token</TableHead>
                  <TableHead>总费用</TableHead>
                  <TableHead>成功/失败/限流</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byModel.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  byModel.slice(0, 20).map((row) => (
                    <TableRow key={row.model}>
                      <TableCell className="font-mono text-xs">{row.model}</TableCell>
                      <TableCell>{row.requestCount.toLocaleString()}</TableCell>
                      <TableCell>{row.totalTokens.toLocaleString()}</TableCell>
                      <TableCell>{Number(row.totalCost).toFixed(4)}</TableCell>
                      <TableCell className="text-xs">
                        {row.successCount} / {row.errorCount} / {row.rateLimitedCount}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {daily.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">每日明细（前 50 条）</h4>
            <div className="overflow-x-auto rounded border max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>请求数</TableHead>
                    <TableHead>总 Token</TableHead>
                    <TableHead>费用</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daily.slice(0, 50).map((row, i) => (
                    <TableRow key={`${row.date}-${row.model}-${i}`}>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="font-mono text-xs">{row.model}</TableCell>
                      <TableCell>{row.requestCount}</TableCell>
                      <TableCell>{row.totalTokens.toLocaleString()}</TableCell>
                      <TableCell>{Number(row.totalCost).toFixed(4)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
