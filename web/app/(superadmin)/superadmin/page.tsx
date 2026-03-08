"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/(dashboard)/components/dashboard-layout"
import { AuthGuard } from "@/app/(auth)/components/auth-guard"
import { SuperadminNav } from "@/app/(superadmin)/components/superadmin-nav"
import { OverviewCards } from "@/app/(superadmin)/components/overview-cards"
import { ModelTable } from "@/app/(superadmin)/components/model-table"
import { ModelBarCharts } from "@/app/(superadmin)/components/model-bar-charts"
import { ModelDailyTrendCharts } from "@/app/(superadmin)/components/model-daily-trend-charts"
import type { SuperadminOverview, ModelsListResponse } from "@/app/(superadmin)/domain/superadmin.types"
import type { ModelDailyStats } from "@/app/(superadmin)/domain/superadmin.types"

export default function SuperadminDashboardPage() {
  const [overview, setOverview] = useState<SuperadminOverview | null>(null)
  const [modelsData, setModelsData] = useState<ModelsListResponse | null>(null)
  const [dailyStats, setDailyStats] = useState<ModelDailyStats[]>([])
  const [loadingOverview, setLoadingOverview] = useState(true)
  const [loadingModels, setLoadingModels] = useState(true)
  const [loadingDaily, setLoadingDaily] = useState(true)

  useEffect(() => {
    fetch("/api/superadmin/overview")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setOverview(json.data)
      })
      .catch(console.error)
      .finally(() => setLoadingOverview(false))
  }, [])

  useEffect(() => {
    fetch("/api/superadmin/models")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) setModelsData(json.data)
      })
      .catch(console.error)
      .finally(() => setLoadingModels(false))
  }, [])

  useEffect(() => {
    fetch("/api/superadmin/models/stats?days=30")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.daily) setDailyStats(json.data.daily)
      })
      .catch(console.error)
      .finally(() => setLoadingDaily(false))
  }, [])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <SuperadminNav />
          <div>
            <h1 className="text-lg font-semibold mb-1">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              模型基本信息与用量统计
            </p>
          </div>
          <OverviewCards data={overview} loading={loadingOverview} />
          <ModelBarCharts
            usageStats={modelsData?.usageStats ?? []}
            loading={loadingModels}
          />
          <ModelDailyTrendCharts daily={dailyStats} loading={loadingDaily} />
          <ModelTable
            pricing={modelsData?.pricing ?? []}
            usageStats={modelsData?.usageStats ?? []}
            gatewayModels={modelsData?.gatewayModels ?? []}
            loading={loadingModels}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
