"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ModelPricingItem, ModelUsageStats } from "@/app/(superadmin)/domain/superadmin.types"

interface ModelTableProps {
  pricing: ModelPricingItem[]
  usageStats: ModelUsageStats[]
  gatewayModels: string[]
  loading?: boolean
}

function inGateway(modelName: string, gatewayModels: string[]): boolean {
  return gatewayModels.includes(modelName)
}

function getUsageForModel(modelName: string, usageStats: ModelUsageStats[]): ModelUsageStats | null {
  return usageStats.find((u) => u.model === modelName) ?? null
}

export function ModelTable({
  pricing,
  usageStats,
  gatewayModels,
  loading,
}: ModelTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型列表</CardTitle>
          <CardContent className="pt-0">
            <div className="h-48 animate-pulse rounded bg-muted" />
          </CardContent>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">模型与定价</CardTitle>
        <p className="text-xs text-muted-foreground">
          共 {pricing.length} 个模型，网关可见 {gatewayModels.length} 个
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>输入/输出单价(1K)</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>请求数(30天)</TableHead>
                <TableHead>总费用(30天)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无模型定价数据
                  </TableCell>
                </TableRow>
              ) : (
                pricing.map((p) => {
                  const usage = getUsageForModel(p.modelName, usageStats)
                  const inGw = inGateway(p.modelName, gatewayModels)
                  return (
                    <TableRow key={p.modelName}>
                      <TableCell className="font-mono text-xs">{p.modelName}</TableCell>
                      <TableCell>
                        <span className="text-xs">{p.providerName ?? p.providerCode}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.inputPrice} / {p.outputPrice}
                      </TableCell>
                      <TableCell>
                        {p.enabled ? (
                          <Badge variant="default" className="text-xs">启用</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">禁用</Badge>
                        )}
                        {!inGw && (
                          <Badge variant="outline" className="ml-1 text-xs">未在网关</Badge>
                        )}
                      </TableCell>
                      <TableCell>{usage ? usage.requestCount.toLocaleString() : "—"}</TableCell>
                      <TableCell>
                        {usage && Number(usage.totalCost) > 0
                          ? Number(usage.totalCost).toFixed(4)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
