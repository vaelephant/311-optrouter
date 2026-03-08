/**
 * 管理后台模块类型定义
 */

export interface UserStatsParams {
  days: number
}

export interface UserStats {
  today: {
    login_users: number
    new_users: number
    visits: number
    visit_users: number
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

export interface AdminSummaryData {
  today: {
    new_users: number
    login_users: number
  }
  seven_days: {
    new_users: number
    login_users: number
  }
  daily_data: Array<{
    date: string
    new_users: number
    login_users: number
  }>
  behavior: {
    today: { usage: number }
    seven_days: { usage: number }
    total_duration_seconds: number
  }
  user_details: Array<{
    user_id: string
    email: string
    created_at: string
  }>
}

export interface DeviceStatsItem {
  device_type: string
  count: number
  percentage: number
}

export interface DeviceStats {
  items: DeviceStatsItem[]
  total: number
}

export interface LocationStatsItem {
  location: string
  count: number
  percentage: number
}

export interface LocationStats {
  items: LocationStatsItem[]
  total: number
}

export interface BehaviorStatsSummary {
  total_sessions: number
  unique_users: number
  total_duration_seconds: number
  average_duration_seconds: number
  active_days: number
}

export interface BehaviorStatsFunction {
  function_name: string
  session_count: number
  total_duration_seconds: number
  average_duration_seconds: number
}

export interface BehaviorStatsUser {
  user_id: string
  email: string
  session_count: number
  total_duration_seconds: number
  average_duration_seconds: number
}

export interface BehaviorStatsDaily {
  date: string
  session_count: number
  unique_users: number
  total_duration_seconds: number
}

export interface BehaviorStatsSession {
  function_name: string
  user_id: string
  email: string
  start_time: string
  end_time: string | null
  duration_seconds: number
}

export interface BehaviorStats {
  summary: BehaviorStatsSummary
  top_functions: BehaviorStatsFunction[]
  active_users: BehaviorStatsUser[]
  daily_activity: BehaviorStatsDaily[]
  recent_sessions: BehaviorStatsSession[]
}

export interface LoginDurationItem {
  user_id: string
  email: string | null
  total_minutes: number
  total_hours: number
}

export interface LoginDurationStats {
  items: LoginDurationItem[]
  total_minutes: number
}
