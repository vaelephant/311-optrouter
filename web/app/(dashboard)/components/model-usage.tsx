"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts"
import { useState, useEffect } from "react"
import { getCurrentUserId } from "@/lib/auth-client"

interface ModelData {
  name: string
  provider: string
  requests: number
  percentage: number
  cost: number
  color: string
}

const defaultModels: ModelData[] = []

const providerColors: Record<string, string> = {
  OpenAI: "oklch(0.65 0.2 250)",
  Anthropic: "oklch(0.72 0.18 165)",
  Google: "oklch(0.75 0.15 80)",
  DeepSeek: "oklch(0.65 0.22 330)",
  Meta: "oklch(0.7 0.2 30)",
}

function PieTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ name: string; value: number }>
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-popover-foreground">{payload[0].name}</p>
      <p className="text-xs text-muted-foreground">{payload[0].value}%</p>
    </div>
  )
}

export function ModelUsage() {
  const [models, setModels] = useState<ModelData[]>(defaultModels)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const userId = getCurrentUserId()
      if (!userId) {
        setModels([])
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/usage?days=30', {
          headers: { 'x-user-id': userId },
        })
        const result = await response.json()

        if (result.model_breakdown) {
          const entries = Object.entries(result.model_breakdown)
          const totalTokens = entries.reduce((sum, [, data]) => sum + (data as { tokens: number }).tokens, 0)
          
          const modelData: ModelData[] = entries.map(([name, data], index) => {
            const d = data as { tokens: number; cost: number; requests: number }
            const provider = getProvider(name)
            return {
              name,
              provider,
              requests: d.requests,
              percentage: totalTokens > 0 ? Math.round((d.tokens / totalTokens) * 100) : 0,
              cost: d.cost,
              color: Object.keys(providerColors)[index % Object.keys(providerColors).length] || "oklch(0.65 0.2 250)",
            }
          }).sort((a, b) => b.percentage - a.percentage)

          // Assign colors based on provider
          modelData.forEach((m, i) => {
            m.color = providerColors[m.provider] || Object.values(providerColors)[i % Object.values(providerColors).length]
          })

          setModels(modelData)
        }
      } catch (error) {
        console.error('Failed to fetch model usage:', error)
        setModels([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const pieData = models.map((m) => ({
    name: m.name,
    value: m.percentage,
  }))

  const COLORS = models.map((m) => m.color)

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          模型使用分布
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : models.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <>
            <div className="mx-auto h-[160px] w-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={72}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2">
              {models.map((model) => (
                <div key={model.name} className="flex items-center gap-3">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ background: model.color }}
                  />
                  <div className="flex flex-1 items-center justify-between min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-medium text-card-foreground truncate">
                        {model.name}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-border text-muted-foreground shrink-0"
                      >
                        {model.provider}
                      </Badge>
                    </div>
                    <span className="text-[11px] font-medium text-card-foreground tabular-nums shrink-0 ml-2">
                      {model.cost < 0.01 && model.cost > 0 
                        ? `$${model.cost.toFixed(4)}` 
                        : `$${model.cost.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function getProvider(modelName: string): string {
  const name = modelName.toLowerCase()
  if (name.includes('gpt') || name.includes('openai')) return 'OpenAI'
  if (name.includes('claude') || name.includes('anthropic')) return 'Anthropic'
  if (name.includes('gemini') || name.includes('google')) return 'Google'
  if (name.includes('deepseek')) return 'DeepSeek'
  if (name.includes('llama') || name.includes('meta')) return 'Meta'
  return 'Other'
}
