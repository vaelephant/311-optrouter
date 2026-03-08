"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import type { ModelPricingItem } from "@/app/(superadmin)/domain/superadmin.types"

interface PricingTableProps {
  pricing: ModelPricingItem[]
  loading?: boolean
  onUpdate: (
    modelName: string,
    patch: { inputPrice?: number; outputPrice?: number; enabled?: boolean }
  ) => Promise<void>
  onRename?: (oldModelName: string, newModelName: string) => Promise<void>
}

export function PricingTable({ pricing, loading, onUpdate, onRename }: PricingTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型定价</CardTitle>
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
        <CardTitle className="text-base">模型定价</CardTitle>
        <p className="text-xs text-muted-foreground">
          共 {pricing.length} 个模型，可修改模型名、单价与启用状态后保存
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>输入单价(1K)</TableHead>
                <TableHead>输出单价(1K)</TableHead>
                <TableHead>启用</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricing.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    暂无模型定价数据
                  </TableCell>
                </TableRow>
              ) : (
                pricing.map((p) => (
                  <PricingRow
                    key={p.id}
                    item={p}
                    onUpdate={onUpdate}
                    onRename={onRename}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function PricingRow({
  item,
  onUpdate,
  onRename,
}: {
  item: ModelPricingItem
  onUpdate: PricingTableProps["onUpdate"]
  onRename?: PricingTableProps["onRename"]
}) {
  const [modelName, setModelName] = useState(item.modelName)
  const [inputPrice, setInputPrice] = useState(item.inputPrice)
  const [outputPrice, setOutputPrice] = useState(item.outputPrice)
  const [enabled, setEnabled] = useState(item.enabled)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const handleSave = () => {
    const inp = Number(inputPrice)
    const out = Number(outputPrice)
    if (Number.isNaN(inp) || Number.isNaN(out)) return
    const nameChanged = modelName.trim() !== item.modelName
    setSaving(true)
    const doSave = async () => {
      let currentName = item.modelName
      if (nameChanged && modelName.trim() && onRename) {
        await onRename(item.modelName, modelName.trim())
        currentName = modelName.trim()
      }
      await onUpdate(currentName, {
        inputPrice: inp,
        outputPrice: out,
        enabled,
      })
    }
    doSave()
      .then(() => setDirty(false))
      .catch(console.error)
      .finally(() => setSaving(false))
  }

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked)
    setDirty(true)
    setSaving(true)
    onUpdate(item.modelName, { enabled: checked })
      .then(() => setDirty(false))
      .catch(console.error)
      .finally(() => setSaving(false))
  }

  const isDirty =
    dirty ||
    modelName.trim() !== item.modelName ||
    inputPrice !== item.inputPrice ||
    outputPrice !== item.outputPrice

  return (
    <TableRow>
      <TableCell>
        <Input
          className="h-8 font-mono text-xs min-w-[140px]"
          value={modelName}
          onChange={(e) => {
            setModelName(e.target.value)
            setDirty(true)
          }}
          placeholder="模型名称"
        />
      </TableCell>
      <TableCell className="text-xs">
        {item.providerName ?? item.providerCode}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="any"
          className="h-8 w-24 text-xs"
          value={inputPrice}
          onChange={(e) => {
            setInputPrice(e.target.value)
            setDirty(true)
          }}
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          step="any"
          className="h-8 w-24 text-xs"
          value={outputPrice}
          onChange={(e) => {
            setOutputPrice(e.target.value)
            setDirty(true)
          }}
        />
      </TableCell>
      <TableCell>
        <Switch
          checked={enabled}
          onCheckedChange={handleEnabledChange}
          disabled={saving}
        />
      </TableCell>
      <TableCell>
        {isDirty && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}
