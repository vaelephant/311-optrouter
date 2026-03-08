"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/(dashboard)/components/dashboard-layout"
import { AuthGuard } from "@/app/(auth)/components/auth-guard"
import { SuperadminNav } from "@/app/(superadmin)/components/superadmin-nav"
import { PricingTable } from "@/app/(superadmin)/components/pricing-table"
import type { ModelPricingItem } from "@/app/(superadmin)/domain/superadmin.types"

export default function SuperadminPricingPage() {
  const [pricing, setPricing] = useState<ModelPricingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/superadmin/models")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.pricing) setPricing(json.data.pricing)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleUpdate = (modelName: string, patch: { inputPrice?: number; outputPrice?: number; enabled?: boolean }) => {
    return fetch(`/api/superadmin/pricing/${encodeURIComponent(modelName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then((res) => {
      if (!res.ok) return res.json().then((j) => { throw new Error(j.detail || "更新失败") })
      setPricing((prev) =>
        prev.map((p) =>
          p.modelName === modelName
            ? {
                ...p,
                ...(patch.inputPrice !== undefined && { inputPrice: String(patch.inputPrice) }),
                ...(patch.outputPrice !== undefined && { outputPrice: String(patch.outputPrice) }),
                ...(patch.enabled !== undefined && { enabled: patch.enabled }),
              }
            : p
        )
      )
    })
  }

  const handleRename = (oldModelName: string, newModelName: string) => {
    return fetch(`/api/superadmin/pricing/${encodeURIComponent(oldModelName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newModelName }),
    }).then((res) => {
      if (!res.ok) return res.json().then((j) => { throw new Error(j.detail || "重命名失败") })
      setPricing((prev) =>
        prev.map((p) =>
          p.modelName === oldModelName ? { ...p, modelName: newModelName } : p
        )
      )
    })
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6">
          <SuperadminNav />
          <div className="mb-6">
            <h1 className="text-lg font-semibold mb-1">配置价格</h1>
            <p className="text-xs text-muted-foreground">
              修改模型输入/输出单价（每 1K tokens）及启用状态
            </p>
          </div>
          <PricingTable
            pricing={pricing}
            loading={loading}
            onUpdate={handleUpdate}
            onRename={handleRename}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
