/**
 * 管理后台模块业务逻辑层
 */
import {
  getTodayNewUsers,
  getTodayLoginUsers,
  getTodayVisits,
  getTodayVisitUsers,
  getSevenDaysNewUsers,
  getSevenDaysLoginUsers,
  getTotalLoginCount,
  getDayNewUsers,
  getDayLoginUsers,
  getLoginLogs,
  getBehaviorLogs,
  getBehaviorStats,
  getRecentUsers,
  findNextLogin,
  findLastBehavior,
} from './admin.repo'
import {
  parseDeviceType,
  parseLocationFromIp,
  calculateSessionDuration,
  getDateString,
} from '@/lib/stats-utils'
import { prisma } from '@/lib/db'
import type {
  UserStatsParams,
  UserStats,
  AdminSummaryData,
  DeviceStats,
  LocationStats,
  BehaviorStats,
  LoginDurationStats,
} from './admin.types'

/**
 * 获取用户统计数据
 */
export async function fetchUserStats(params: UserStatsParams): Promise<UserStats> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endDate = new Date(todayStart)
  endDate.setDate(endDate.getDate() + 1)
  const startDate = new Date(todayStart)
  startDate.setDate(startDate.getDate() - params.days + 1)

  // ========== 今日统计 ==========
  const todayNewUsers = await getTodayNewUsers(todayStart, endDate)
  const todayLoginUsers = await getTodayLoginUsers(todayStart, endDate)
  const todayVisits = await getTodayVisits(todayStart, endDate)
  const todayVisitUsers = await getTodayVisitUsers(todayStart, endDate)

  // ========== 近7日统计 ==========
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const sevenDaysNewUsers = await getSevenDaysNewUsers(sevenDaysAgo)
  const sevenDaysLoginUsers = await getSevenDaysLoginUsers(sevenDaysAgo)

  // ========== 总登录次数 ==========
  const totalLoginCount = await getTotalLoginCount()

  // ========== 每日数据 ==========
  const dailyData = []
  for (let i = 0; i < params.days; i++) {
    // 从 startDate 开始，每天递增
    // 使用本地时区创建日期对象，避免 UTC 转换问题
    const targetDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)

    const dayNewUsers = await getDayNewUsers(targetDate, nextDate)
    const dayLoginUsers = await getDayLoginUsers(targetDate, nextDate)

    // 使用本地时区格式化日期，确保年份正确
    // 直接使用 Date 对象的本地时间方法，而不是 UTC 方法
    const year = targetDate.getFullYear()
    const month = String(targetDate.getMonth() + 1).padStart(2, '0')
    const day = String(targetDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    // 添加调试日志（生产环境可移除）
    if (i === 0 || i === params.days - 1) {
      console.log(`[fetchUserStats] day ${i}: targetDate=${targetDate.toISOString()}, localDate=${targetDate.toLocaleDateString('zh-CN')}, dateString=${dateString}, year=${year}`)
    }

    dailyData.push({
      date: dateString,
      login_users: dayLoginUsers,
      new_users: dayNewUsers,
    })
  }

  return {
    today: {
      login_users: todayLoginUsers,
      new_users: todayNewUsers,
      visits: todayVisits,
      visit_users: todayVisitUsers,
    },
    seven_days: {
      login_users: sevenDaysLoginUsers,
      new_users: sevenDaysNewUsers,
    },
    total: {
      login_count: totalLoginCount,
    },
    daily_data: dailyData,
  }
}

/**
 * 获取管理后台摘要统计
 */
export async function fetchAdminSummary(): Promise<AdminSummaryData> {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  // 今日统计
  const todayNewUsers = await getTodayNewUsers(todayStart, todayEnd)
  const todayLoginUsers = await getTodayLoginUsers(todayStart, todayEnd)

  // 近7日统计
  const sevenDaysNewUsers = await getSevenDaysNewUsers(sevenDaysAgo)
  const sevenDaysLoginUsers = await getSevenDaysLoginUsers(sevenDaysAgo)

  // 每日数据
  const dailyData = []
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(todayStart)
    targetDate.setDate(targetDate.getDate() - (6 - i))
    const nextDate = new Date(targetDate)
    nextDate.setDate(nextDate.getDate() + 1)

    const dayNewUsers = await getDayNewUsers(targetDate, nextDate)
    const dayLoginUsers = await getDayLoginUsers(targetDate, nextDate)

    dailyData.push({
      date: getDateString(targetDate),
      new_users: dayNewUsers,
      login_users: dayLoginUsers,
    })
  }

  // 行为统计
  const behaviorStats = await getBehaviorStats(todayStart, todayEnd)
  const sevenDaysBehaviorStats = await getBehaviorStats(sevenDaysAgo, now)

  // 用户详情
  const recentUsers = await getRecentUsers(10)

  return {
    today: {
      new_users: todayNewUsers,
      login_users: todayLoginUsers,
    },
    seven_days: {
      new_users: sevenDaysNewUsers,
      login_users: sevenDaysLoginUsers,
    },
    daily_data: dailyData,
    behavior: {
      today: { usage: behaviorStats.todayCount },
      seven_days: { usage: behaviorStats.sevenDaysCount },
      total_duration_seconds: behaviorStats.totalDurationSeconds,
    },
    user_details: recentUsers.map((user) => ({
      user_id: user.id,
      email: user.email,
      created_at: user.createdAt.toISOString(),
    })),
  }
}

/**
 * 获取设备统计
 */
export async function fetchDeviceStats(days: number): Promise<DeviceStats> {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  const loginLogs = await getLoginLogs(startDate, { includeUserAgent: true })

  const deviceCounts: Record<string, number> = {}
  loginLogs.forEach((log) => {
    if (log.userAgent) {
      const deviceType = parseDeviceType(log.userAgent)
      deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1
    }
  })

  const total = Object.values(deviceCounts).reduce((sum, count) => sum + count, 0)
  const items = Object.entries(deviceCounts)
    .map(([device_type, count]) => ({
      device_type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return { items, total }
}

/**
 * 获取地点统计
 */
export async function fetchLocationStats(days: number): Promise<LocationStats> {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  const loginLogs = await getLoginLogs(startDate, { includeIpAddress: true })

  const locationPromises = loginLogs.map((log) => parseLocationFromIp(log.ipAddress))
  const locations = await Promise.all(locationPromises)

  const locationCounts: Record<string, number> = {}
  locations.forEach((location) => {
    if (location) {
      locationCounts[location] = (locationCounts[location] || 0) + 1
    }
  })

  const total = Object.values(locationCounts).reduce((sum, count) => sum + count, 0)
  const items = Object.entries(locationCounts)
    .map(([location, count]) => ({
      location,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return { items, total }
}

/**
 * 获取行为统计
 */
export async function fetchBehaviorStats(days: number): Promise<BehaviorStats> {
  const INTERNAL_FUNCTION_LABEL = '未命名功能'

  function sanitizeDuration(
    log: { startTime: Date; endTime: Date | null; durationSeconds: number | null },
    now: Date
  ): number {
    const explicit = typeof log.durationSeconds === 'number' ? log.durationSeconds : 0
    if (explicit > 0) {
      return explicit
    }

    const start = log.startTime
    if (!start) {
      return 0
    }

    const end = log.endTime ?? now
    const diffSeconds = (end.getTime() - start.getTime()) / 1000
    return diffSeconds > 0 ? diffSeconds : 0
  }

  function maskEmail(email: string | null): string {
    if (!email) {
      return '-'
    }
    const [local, domain] = email.split('@')
    if (!domain) return email
    const maskedLocal = local.length > 2 ? `${local.slice(0, 2)}****${local.slice(-1)}` : '****'
    return `${maskedLocal}@${domain}`
  }

  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  const logs = await getBehaviorLogs(startDate, 2000)

  if (logs.length === 0) {
    return {
      summary: {
        total_sessions: 0,
        unique_users: 0,
        total_duration_seconds: 0,
        average_duration_seconds: 0,
        active_days: 0,
      },
      top_functions: [],
      active_users: [],
      daily_activity: [],
      recent_sessions: [],
    }
  }

  const uniqueUsers = new Set<string>()
  const activeDays = new Set<string>()

  const functionMap = new Map<
    string,
    {
      sessionCount: number
      totalDuration: number
    }
  >()

  const userMap = new Map<
    string,
    {
      email: string
      sessionCount: number
      totalDuration: number
    }
  >()

  const dailyMap = new Map<
    string,
    {
      sessionCount: number
      totalDuration: number
      users: Set<string>
    }
  >()

  let totalDurationSeconds = 0

  logs.forEach((log) => {
    const duration = sanitizeDuration(log, now)
    totalDurationSeconds += duration

    const userId = log.userId
    uniqueUsers.add(userId)

    const functionName = log.functionName?.trim() || INTERNAL_FUNCTION_LABEL

    const startDateObj = log.startTime
    if (startDateObj) {
      const dateKey = startDateObj.toISOString().slice(0, 10)
      activeDays.add(dateKey)
      const daily = dailyMap.get(dateKey) ?? {
        sessionCount: 0,
        totalDuration: 0,
        users: new Set<string>(),
      }
      daily.sessionCount += 1
      daily.totalDuration += duration
      daily.users.add(userId)
      dailyMap.set(dateKey, daily)
    }

    const aggregateFunction = functionMap.get(functionName) ?? {
      sessionCount: 0,
      totalDuration: 0,
    }
    aggregateFunction.sessionCount += 1
    aggregateFunction.totalDuration += duration
    functionMap.set(functionName, aggregateFunction)

    const aggregateUser = userMap.get(userId) ?? {
      email: log.email ?? '',
      sessionCount: 0,
      totalDuration: 0,
    }
    aggregateUser.sessionCount += 1
    aggregateUser.totalDuration += duration
    userMap.set(userId, aggregateUser)
  })

  const topFunctions = Array.from(functionMap.entries())
    .map(([name, value]) => ({
      function_name: name,
      session_count: value.sessionCount,
      total_duration_seconds: Math.round(value.totalDuration),
      average_duration_seconds:
        value.sessionCount > 0 ? Math.round(value.totalDuration / value.sessionCount) : 0,
    }))
    .sort(
      (a, b) =>
        b.total_duration_seconds - a.total_duration_seconds ||
        b.session_count - a.session_count
    )
    .slice(0, 8)

  const activeUsers = Array.from(userMap.entries())
    .map(([id, value]) => ({
      user_id: id,
      email: maskEmail(value.email),
      session_count: value.sessionCount,
      total_duration_seconds: Math.round(value.totalDuration),
      average_duration_seconds:
        value.sessionCount > 0 ? Math.round(value.totalDuration / value.sessionCount) : 0,
    }))
    .sort(
      (a, b) =>
        b.total_duration_seconds - a.total_duration_seconds ||
        b.session_count - a.session_count
    )
    .slice(0, 8)

  const dailyActivity = Array.from(dailyMap.entries())
    .map(([date, value]) => ({
      date,
      session_count: value.sessionCount,
      unique_users: value.users.size,
      total_duration_seconds: Math.round(value.totalDuration),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  const recentSessions = logs.slice(0, 10).map((log) => ({
    function_name: log.functionName?.trim() || INTERNAL_FUNCTION_LABEL,
    user_id: log.userId,
    email: maskEmail(log.email),
    start_time: log.startTime.toISOString(),
    end_time: log.endTime?.toISOString() || null,
    duration_seconds: Math.round(sanitizeDuration(log, now)),
  }))

  return {
    summary: {
      total_sessions: logs.length,
      unique_users: uniqueUsers.size,
      total_duration_seconds: Math.round(totalDurationSeconds),
      average_duration_seconds: logs.length > 0 ? Math.round(totalDurationSeconds / logs.length) : 0,
      active_days: activeDays.size,
    },
    top_functions: topFunctions,
    active_users: activeUsers,
    daily_activity: dailyActivity,
    recent_sessions: recentSessions,
  }
}

/**
 * 获取登录时长统计
 */
export async function fetchLoginDurationStats(days: number): Promise<LoginDurationStats> {
  const now = new Date()
  const startDate = new Date(now)
  startDate.setDate(startDate.getDate() - days)

  const loginLogs = await getLoginLogs(startDate)

  const durationMap: Record<string, { minutes: number; email?: string | null }> = {}

  for (const log of loginLogs) {
    const durationMinutes = await calculateSessionDuration(log.loginAt, log.userId, prisma)

    if (durationMinutes !== null) {
      if (!durationMap[log.userId]) {
        durationMap[log.userId] = { minutes: 0, email: log.email }
      }
      durationMap[log.userId].minutes += durationMinutes
      if (!durationMap[log.userId].email && log.email) {
        durationMap[log.userId].email = log.email
      }
    }
  }

  const items = Object.entries(durationMap)
    .map(([userId, data]) => ({
      user_id: userId,
      email: data.email ?? null,
      total_minutes: Math.round(data.minutes),
      total_hours: Math.round((data.minutes / 60) * 10) / 10,
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes)
    .slice(0, 20)

  const total = items.reduce((sum, item) => sum + item.total_minutes, 0)

  return {
    items,
    total_minutes: total,
  }
}
