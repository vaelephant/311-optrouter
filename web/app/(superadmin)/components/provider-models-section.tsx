"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { ProviderItem } from "@/app/(superadmin)/domain/superadmin.types"
import type { ModelPricingItem } from "@/app/(superadmin)/domain/superadmin.types"

interface ProviderModelsSectionProps {
  providers: ProviderItem[]
  pricing: ModelPricingItem[]
  loading?: boolean
}

export function ProviderModelsSection({
  providers,
  pricing,
  loading,
}: ProviderModelsSectionProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">各供应商关联模型</CardTitle>
          <CardContent className="pt-0">
            <div className="h-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </CardHeader>
      </Card>
    )
  }

  const byProvider = new Map<number, ModelPricingItem[]>()
  for (const p of pricing) {
    const key = p.providerId ?? -1
    if (key >= 0) {
      if (!byProvider.has(key)) byProvider.set(key, [])
      byProvider.get(key)!.push(p)
    }
  }
  // 按 providerCode 分组（未关联 providerId 的模型）
  const byCode = new Map<string, ModelPricingItem[]>()
  for (const p of pricing) {
    if (p.providerId == null) {
      const key = p.providerCode
      if (!byCode.has(key)) byCode.set(key, [])
      byCode.get(key)!.push(p)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">各供应商关联模型</CardTitle>
        <p className="text-xs text-muted-foreground">
          按供应商分组的模型定价，便于管理
        </p>
      </CardHeader>
      <CardContent>
        {providers.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无供应商数据</p>
        ) : (
          <div className="space-y-6">
            {providers.map((prov) => {
              const list = byProvider.get(prov.id) ?? byCode.get(prov.code) ?? []
              return (
                <div key={prov.id}>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                    {prov.name ?? prov.code}
                    <Badge variant="secondary" className="text-xs">
                      {list.length} 个模型
                    </Badge>
                  </h4>
                  <div className="rounded border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>模型</TableHead>
                          <TableHead>输入/输出单价(1K)</TableHead>
                          <TableHead>状态</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground py-4 text-xs"
                            >
                              暂无关联模型
                            </TableCell>
                          </TableRow>
                        ) : (
                          list.map((m) => (
                            <TableRow key={m.modelName}>
                              <TableCell className="font-mono text-xs">
                                {m.modelName}
                              </TableCell>
                              <TableCell className="text-xs">
                                {m.inputPrice} / {m.outputPrice}
                              </TableCell>
                              <TableCell>
                                {m.enabled ? (
                                  <Badge variant="default" className="text-xs">
                                    启用
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    禁用
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
