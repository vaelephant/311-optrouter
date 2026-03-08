"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/(dashboard)/components/dashboard-layout"
import { AuthGuard } from "@/app/(auth)/components/auth-guard"
import { SuperadminNav } from "@/app/(superadmin)/components/superadmin-nav"
import { ProviderList } from "@/app/(superadmin)/components/provider-list"
import type { ProviderItem } from "@/app/(superadmin)/domain/superadmin.types"
import type { ModelPricingItem } from "@/app/(superadmin)/domain/superadmin.types"

export default function SuperadminProvidersPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [pricing, setPricing] = useState<ModelPricingItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = () => {
    Promise.all([
      fetch("/api/superadmin/providers").then((r) => r.json()),
      fetch("/api/superadmin/models").then((r) => r.json()),
    ])
      .then(([provRes, modelsRes]) => {
        if (provRes.success && provRes.data) setProviders(provRes.data)
        if (modelsRes.success && modelsRes.data?.pricing) setPricing(modelsRes.data.pricing)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    fetchData()
  }, [])

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <SuperadminNav />
          <div>
            <h1 className="text-lg font-semibold mb-1">供应商管理</h1>
            <p className="text-xs text-muted-foreground">
              供应商列表及关联模型管理
            </p>
          </div>
          <ProviderList
            providers={providers}
            pricing={pricing}
            loading={loading}
            onAdded={fetchData}
            onModelUpdate={(modelName, patch) =>
              fetch(`/api/superadmin/pricing/${encodeURIComponent(modelName)}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(patch),
              }).then((res) => {
                if (!res.ok) return res.json().then((j: { detail?: string }) => { throw new Error(j.detail || "更新失败") })
                fetchData()
              })
            }
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
