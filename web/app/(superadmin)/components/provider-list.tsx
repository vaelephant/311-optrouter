"use client"

import { useState, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Loader2 } from "lucide-react"
import type { ProviderItem } from "@/app/(superadmin)/domain/superadmin.types"
import type { ModelPricingItem } from "@/app/(superadmin)/domain/superadmin.types"

interface ProviderListProps {
  providers: ProviderItem[]
  pricing: ModelPricingItem[]
  loading?: boolean
  onAdded?: () => void
  onModelUpdate?: (modelName: string, patch: { enabled: boolean }) => Promise<void>
}

function buildProviderModelRows(
  providers: ProviderItem[],
  pricing: ModelPricingItem[]
): { provider: ProviderItem; model: ModelPricingItem | null }[] {
  const byProviderId = new Map<number, ModelPricingItem[]>()
  const byCode = new Map<string, ModelPricingItem[]>()
  for (const m of pricing) {
    if (m.providerId != null) {
      if (!byProviderId.has(m.providerId)) byProviderId.set(m.providerId, [])
      byProviderId.get(m.providerId)!.push(m)
    } else {
      if (!byCode.has(m.providerCode)) byCode.set(m.providerCode, [])
      byCode.get(m.providerCode)!.push(m)
    }
  }
  const rows: { provider: ProviderItem; model: ModelPricingItem | null }[] = []
  for (const prov of providers) {
    const models = byProviderId.get(prov.id) ?? byCode.get(prov.code) ?? []
    if (models.length > 0) {
      for (const model of models) {
        rows.push({ provider: prov, model })
      }
    } else {
      rows.push({ provider: prov, model: null })
    }
  }
  return rows
}

export function ProviderList({ providers, pricing, loading, onAdded, onModelUpdate }: ProviderListProps) {
  const rows = useMemo(
    () => buildProviderModelRows(providers, pricing),
    [providers, pricing]
  )
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [name, setName] = useState("")
  const [baseUrl, setBaseUrl] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [updatingModel, setUpdatingModel] = useState<string | null>(null)

  const handleModelEnabledChange = (modelName: string, enabled: boolean) => {
    if (!onModelUpdate) return
    setUpdatingModel(modelName)
    onModelUpdate(modelName, { enabled })
      .catch(console.error)
      .finally(() => setUpdatingModel(null))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!code.trim()) {
      setError("请输入供应商代码")
      return
    }
    if (!baseUrl.trim()) {
      setError("请输入 Base URL")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/superadmin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim() || undefined,
          baseUrl: baseUrl.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || "添加失败")
        return
      }
      setOpen(false)
      setCode("")
      setName("")
      setBaseUrl("")
      onAdded?.()
    } catch (e) {
      setError("请求失败")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">供应商与关联模型</CardTitle>
          <CardContent className="pt-0">
            <div className="h-32 animate-pulse rounded bg-muted" />
          </CardContent>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">供应商与关联模型</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            共 {providers.length} 个供应商，{rows.length} 条记录
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              添加供应商
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>添加供应商</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="provider-code">代码 *</Label>
                  <Input
                    id="provider-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="如 openai、ollama"
                    className="font-mono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-name">名称</Label>
                  <Input
                    id="provider-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="显示名称，可选"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="provider-baseurl">Base URL *</Label>
                  <Input
                    id="provider-baseurl"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  添加
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>供应商</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>模型</TableHead>
                <TableHead>输入单价(1K)</TableHead>
                <TableHead>输出单价(1K)</TableHead>
                <TableHead>状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    暂无供应商数据，请先添加供应商或执行 seed
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ provider, model }) => (
                  <TableRow
                    key={model ? model.modelName : `prov-${provider.id}-empty`}
                  >
                    <TableCell className="whitespace-nowrap">
                      <span className="text-muted-foreground text-xs">
                        #{provider.id}
                      </span>
                      <span className="font-mono text-xs ml-1">
                        {provider.code}
                      </span>
                      {provider.name && (
                        <span className="text-xs text-muted-foreground ml-1">
                          {provider.name}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate text-xs"
                      title={provider.baseUrl}
                    >
                      {provider.baseUrl}
                    </TableCell>
                    <TableCell>
                      {model ? (
                        <span className="font-mono text-xs">
                          {model.modelName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {model ? model.inputPrice : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {model ? model.outputPrice : "—"}
                    </TableCell>
                    <TableCell>
                      {model ? (
                        onModelUpdate ? (
                          <Switch
                            checked={model.enabled}
                            disabled={updatingModel === model.modelName}
                            onCheckedChange={(checked) =>
                              handleModelEnabledChange(model.modelName, checked)
                            }
                          />
                        ) : model.enabled ? (
                          <Badge variant="default" className="text-xs">
                            启用
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            禁用
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
