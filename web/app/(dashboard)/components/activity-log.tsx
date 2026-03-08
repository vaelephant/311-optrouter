"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getCurrentUserId } from "@/lib/auth-client"
import { formatDistanceToNow } from "date-fns"
import { zhCN } from "date-fns/locale"

interface Activity {
  id: string
  model: string
  type: string
  status: string
  tokens: number
  latency: string
  time: string
}

export function ActivityLog() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchActivities() {
      const userId = getCurrentUserId()
      if (!userId) {
        setActivities([])
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/activity', {
          headers: { 'x-user-id': userId },
        })
        
        if (!response.ok) {
          console.error('Activity API error:', response.status, response.statusText)
          setActivities([])
          setLoading(false)
          return
        }
        
        const result = await response.json()
        
        if (result.error) {
          console.error('Activity API returned error:', result.error)
          setActivities([])
          setLoading(false)
          return
        }

        if (result.data && Array.isArray(result.data)) {
          // API 返回的数据已经是处理好的 ActivityLog 格式，直接使用
          setActivities(result.data as Activity[])
        } else {
          setActivities([])
        }
      } catch (error) {
        console.error('Failed to fetch activity log:', error)
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [])

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-card-foreground">
              最近请求
            </CardTitle>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
              查看全部
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex h-[340px] items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-card-foreground">
              最近请求
            </CardTitle>
            <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
              查看全部
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无请求记录
          </div>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-card-foreground">
            最近请求
          </CardTitle>
          <button className="text-xs text-primary hover:text-primary/80 transition-colors font-medium">
            查看全部
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[340px] overflow-y-auto px-6">
          {activities.map((activity, idx) => (
            <div
              key={activity.id}
              className={`flex items-center gap-4 py-3 ${
                idx !== activities.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {/* Status dot */}
              <div
                className={`size-2 shrink-0 rounded-full ${
                  activity.status === "success"
                    ? "bg-success"
                    : activity.status === "error"
                    ? "bg-destructive"
                    : "bg-warning"
                }`}
              />
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-card-foreground">
                    {activity.model}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 border-border text-muted-foreground font-mono"
                  >
                    {activity.type}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {activity.time}
                </p>
              </div>
              {/* Metrics */}
              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <p className="text-[10px] text-muted-foreground">Token</p>
                  <p className="text-xs font-medium tabular-nums text-card-foreground">
                    {activity.tokens > 0
                      ? activity.tokens.toLocaleString()
                      : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">延迟</p>
                  <p className="text-xs font-medium tabular-nums text-card-foreground">
                    {activity.latency}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
