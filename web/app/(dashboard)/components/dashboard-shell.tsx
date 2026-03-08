"use client"

import { StatCards } from "./stat-cards"
import { UsageChart } from "./usage-chart"
import { ModelUsage } from "./model-usage"
import { ApiKeys } from "./api-keys"
import { ActivityLog } from "./activity-log"
import { QuickStart } from "./quick-start"
import { PopularModels } from "./popular-models"

export function DashboardShell() {
  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Stats */}
        <StatCards />

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <UsageChart />
          </div>
          <div className="lg:col-span-2">
            <ModelUsage />
          </div>
        </div>

        {/* API Keys & Activity */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ApiKeys />
          <ActivityLog />
        </div>

        {/* Models table */}
        <PopularModels />

        {/* Quick start */}
        <QuickStart />
      </div>
    </div>
  )
}
