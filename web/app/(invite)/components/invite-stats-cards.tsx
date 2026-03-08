"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface InviteStats {
  total_invites?: number
  valid_invites?: number
  pending_rewards?: number
}

interface InviteStatsCardsProps {
  stats: InviteStats | null
}

export function InviteStatsCards({ stats }: InviteStatsCardsProps) {
  if (!stats) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">总邀请数</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total_invites || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">有效邀请</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.valid_invites || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">待发放奖励</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pending_rewards || 0}</div>
        </CardContent>
      </Card>
    </div>
  )
}
