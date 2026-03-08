"use client"

import { useState, useEffect } from 'react'
import { DashboardLayout } from '../../(dashboard)/components/dashboard-layout'
import { AuthGuard } from '../../(auth)/components/auth-guard'
import { UserStatsCards } from '../../(admin)/components/user-stats-cards'
import { UserStatsTrendChart } from '../../(admin)/components/user-stats-trend-chart'
import { getCurrentUserId } from '@/lib/auth-client'

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
  daily_data: Array<{
    date: string
    login_users: number
    new_users: number
  }>
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStats = async () => {
    const userId = getCurrentUserId()
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/stats/users?days=7', {
        headers: {
          'x-user-id': userId,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      } else {
        console.error('获取统计失败:', result.detail)
      }
    } catch (error) {
      console.error('获取统计失败:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchStats()
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          {/* 页面标题 */}
          <div>
            <h1 className="text-2xl font-bold mb-1">用户数据统计</h1>
            <p className="text-sm text-muted-foreground">
              登录行为·访问记录·功能使用分析
            </p>
          </div>

          {/* 统计卡片（两排：登录和注册） */}
          <UserStatsCards
            stats={stats ? {
              today: stats.today,
              seven_days: stats.seven_days,
              total: stats.total,
            } : null}
            loading={loading}
          />

          {/* 趋势图表 */}
          <UserStatsTrendChart
            data={stats?.daily_data || []}
            loading={loading || refreshing}
            onRefresh={handleRefresh}
          />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
