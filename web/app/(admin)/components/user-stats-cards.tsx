"use client"

import { Card, CardContent } from "@/components/ui/card"
import { LogIn, UserPlus, TrendingUp, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsData {
  today: {
    login_users: number
    new_users: number
    visits?: number
    visit_users?: number
  }
  seven_days: {
    login_users: number
    new_users: number
  }
  total: {
    login_count: number
  }
}

interface UserStatsCardsProps {
  stats: StatsData | null
  loading?: boolean
}

export function UserStatsCards({ stats, loading }: UserStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-8 bg-muted rounded w-16 mb-1" />
              <div className="h-3 bg-muted rounded w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    // First row: Login stats
    {
      icon: LogIn,
      label: "今日登录",
      value: stats.today.login_users,
      subtitle: "用户(去重)",
      highlight: true,
    },
    {
      icon: TrendingUp,
      label: "近7日登录",
      value: stats.seven_days.login_users,
      subtitle: "用户(去重)",
      highlight: true,
    },
    // Second row: Registration stats
    {
      icon: UserPlus,
      label: "今日新注册",
      value: stats.today.new_users,
      subtitle: "用户",
      highlight: false,
    },
    {
      icon: UserPlus,
      label: "近7日新注册",
      value: stats.seven_days.new_users,
      subtitle: "用户",
      highlight: false,
    },
    // Third card: Total login count
    {
      icon: Clock,
      label: "总登录次数",
      value: stats.total.login_count,
      subtitle: "历史累计",
      highlight: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card
            key={index}
            className={cn(
              "border transition-all hover:shadow-md",
              card.highlight && "border-destructive"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{card.label}</span>
                </div>
              </div>
              <div
                className={cn(
                  "text-2xl font-bold mb-1",
                  card.highlight && "text-destructive"
                )}
              >
                {card.value.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">{card.subtitle}</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
