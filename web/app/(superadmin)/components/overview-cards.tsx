"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Cpu, Layers, Zap, DollarSign } from "lucide-react"
import type { SuperadminOverview } from "@/app/(superadmin)/domain/superadmin.types"

interface OverviewCardsProps {
  data: SuperadminOverview | null
  loading?: boolean
}

function formatCost(value: string): string {
  const n = Number(value)
  if (n === 0) return "0"
  if (n < 0.01) return n.toFixed(6)
  if (n < 1) return n.toFixed(4)
  return n.toFixed(2)
}

export function OverviewCards({ data, loading }: OverviewCardsProps) {
  if (loading) {
    return (
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
    )
  }

  if (!data) return null

  const cards = [
    {
      icon: Cpu,
      label: "模型总数",
      value: data.totalModels,
      subtitle: `已启用 ${data.enabledModels}`,
    },
    {
      icon: Layers,
      label: "供应商",
      value: data.totalProviders,
      subtitle: "个供应商",
    },
    {
      icon: Zap,
      label: "请求量",
      value: `${data.totalRequestsToday} / ${data.totalRequests7Days}`,
      subtitle: "今日 / 近7日",
    },
    {
      icon: DollarSign,
      label: "费用",
      value: `${formatCost(data.totalCostToday)} / ${formatCost(data.totalCost7Days)}`,
      subtitle: "今日 / 近7日",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, i) => {
        const Icon = card.icon
        return (
          <Card key={i} className="border transition-all hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              <div className="text-xl font-bold mb-1">{card.value}</div>
              <div className="text-xs text-muted-foreground">{card.subtitle}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
