"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/(dashboard)/components/dashboard-layout"
import { AuthGuard } from "@/app/(auth)/components/auth-guard"
import { SuperadminNav } from "@/app/(superadmin)/components/superadmin-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Activity, Wifi, WifiOff, Clock, CheckCircle, XCircle, HelpCircle } from "lucide-react"
import type { StatusOverview, ModelStatusItem } from "@/app/(superadmin)/domain/superadmin.service"

export default function SuperadminStatusPage() {
  const [data, setData] = useState<StatusOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(1)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/superadmin/status?days=${days}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) setData(res.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [days])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <SuperadminNav />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold mb-1">模型状态</h1>
              <p className="text-xs text-muted-foreground">
                网关与各模型是否通、响应时间（优先来自 Gateway 实时探测，否则为近期用量统计）
              </p>
            </div>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              <option value={1}>近 1 天</option>
              <option value={7}>近 7 天</option>
              <option value={30}>近 30 天</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-20 mb-2" />
                    <div className="h-8 bg-muted rounded w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : data ? (
            <>
              <Card className="border">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">网关状态</span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-2">
                      {data.gateway.status === "healthy" ? (
                        <>
                          <Wifi className="h-5 w-5 text-green-600" />
                          <span className="text-green-600 font-medium">通</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-5 w-5 text-destructive" />
                          <span className="text-destructive font-medium">不通</span>
                          {data.gateway.error && (
                            <span className="text-xs text-muted-foreground">({data.gateway.error})</span>
                          )}
                        </>
                      )}
                    </span>
                    {data.gateway.latencyMs != null && (
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <Clock className="h-4 w-4" />
                        响应时间 {data.gateway.latencyMs} ms
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-sm font-medium mb-3">各模型状态与响应时间</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {data.modelStats.map((item) => (
                    <ModelStatusCard key={item.model} item={item} />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">暂无数据</p>
          )}
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

function ModelStatusCard({ item }: { item: ModelStatusItem }) {
  const reachable =
    item.gatewayReachable !== undefined
      ? item.gatewayReachable
      : item.status === "ok"
  const statusLabel = reachable ? "通" : item.status === "fail" ? "不通" : "未知"
  const StatusIcon = reachable ? CheckCircle : item.status === "fail" ? XCircle : HelpCircle
  const statusColor = reachable
    ? "text-green-600"
    : item.status === "fail"
      ? "text-destructive"
      : "text-muted-foreground"
  const latencyMs =
    item.gatewayLatencyMs != null ? item.gatewayLatencyMs : item.avgLatencyMs

  return (
    <Card className="border">
      <CardContent className="p-3">
        <div className="font-medium text-sm truncate" title={item.model}>
          {item.model}
        </div>
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className={`flex items-center gap-1 ${statusColor}`}>
            <StatusIcon className="h-3.5 w-3.5" />
            {statusLabel}
          </span>
          <span className="text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {latencyMs != null ? `${Math.round(latencyMs)} ms` : "—"}
          </span>
        </div>
        {item.requestCount > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            请求 {item.requestCount}（成功 {item.successCount} / 失败 {item.errorCount}）
          </div>
        )}
      </CardContent>
    </Card>
  )
}
