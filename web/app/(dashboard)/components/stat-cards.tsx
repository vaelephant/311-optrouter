"use client"

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownRight, Zap, DollarSign, Clock, Activity } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { getCurrentUserId } from '@/lib/auth-client'

interface Stats {
  label: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: React.ElementType
  description: string
}

export function StatCards() {
  const [stats, setStats] = useState<Stats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const userId = getCurrentUserId()
      if (!userId) {
        setStats(getDefaultStats())
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/usage?days=30', {
          headers: { 'x-user-id': userId },
        })
        
        if (!response.ok) {
          console.error('API error:', response.status, response.statusText)
          setStats(getDefaultStats())
          setLoading(false)
          return
        }
        
        const data = await response.json()
        
        if (data.error) {
          console.error('API returned error:', data.error)
          setStats(getDefaultStats())
          setLoading(false)
          return
        }

        if (data.summary) {
          setStats([
            {
              label: 'API 请求总量',
              value: data.summary.total_requests.toLocaleString(),
              change: '—',
              trend: 'up',
              icon: Zap,
              description: '过去 30 天',
            },
            {
              label: '消费金额',
              value: data.summary.total_cost < 0.01 && data.summary.total_cost > 0
                ? `$${data.summary.total_cost.toFixed(4)}`
                : `$${data.summary.total_cost.toFixed(2)}`,
              change: '—',
              trend: 'up',
              icon: DollarSign,
              description: '本月累计',
            },
            {
              label: '平均延迟',
              value: `${(data.summary.avg_latency_ms || 0).toLocaleString()}ms`,
              change: '—',
              trend: 'down',
              icon: Clock,
              description: '统计期内平均',
            },
            {
              label: '成功率',
              value: `${Number(data.summary.success_rate || 0).toFixed(2)}%`,
              change: '—',
              trend: 'up',
              icon: Activity,
              description: '统计期内',
            },
          ])
        } else {
          console.warn('API response missing summary:', data)
          setStats(getDefaultStats())
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
        setStats(getDefaultStats())
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="mt-3 h-8 w-32 bg-muted animate-pulse rounded" />
              <div className="mt-2 h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </span>
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
                <stat.icon className="size-4 text-primary" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold tracking-tight text-card-foreground">
                {stat.value}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`inline-flex items-center text-xs font-medium ${
                  stat.label === '平均延迟'
                    ? 'text-success'
                    : stat.trend === 'up'
                    ? 'text-success'
                    : 'text-chart-5'
                }`}
              >
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="mr-0.5 size-3" />
                ) : (
                  <ArrowDownRight className="mr-0.5 size-3" />
                )}
                {stat.change}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {stat.description}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function getDefaultStats(): Stats[] {
  return [
    {
      label: 'API 请求总量',
      value: '0',
      change: '0%',
      trend: 'up',
      icon: Zap,
      description: '请先登录',
    },
    {
      label: '消费金额',
      value: '$0.00',
      change: '0%',
      trend: 'up',
      icon: DollarSign,
      description: '请先登录',
    },
    {
      label: '平均延迟',
      value: '0ms',
      change: '0%',
      trend: 'down',
      icon: Clock,
      description: '请先登录',
    },
    {
      label: '成功率',
      value: '0%',
      change: '0%',
      trend: 'up',
      icon: Activity,
      description: '请先登录',
    },
  ]
}
