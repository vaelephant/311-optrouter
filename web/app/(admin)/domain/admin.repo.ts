/**
 * 管理后台模块数据访问层
 */
import { prisma } from '@/lib/db'

/**
 * 获取今日新注册用户数
 */
export async function getTodayNewUsers(todayStart: Date, todayEnd: Date) {
  return prisma.user.count({
    where: {
      createdAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  })
}

/**
 * 获取今日登录用户（去重）
 */
export async function getTodayLoginUsers(todayStart: Date, todayEnd: Date) {
  const logs = await prisma.userLoginLog.findMany({
    where: {
      loginAt: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    select: {
      userId: true,
    },
  })
  return new Set(logs.map((log) => log.userId)).size
}

/**
 * 获取今日访问次数
 */
export async function getTodayVisits(todayStart: Date, todayEnd: Date) {
  return prisma.userBehaviorLog.count({
    where: {
      startTime: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
  })
}

/**
 * 获取今日访问用户数（去重）
 */
export async function getTodayVisitUsers(todayStart: Date, todayEnd: Date) {
  const logs = await prisma.userBehaviorLog.findMany({
    where: {
      startTime: {
        gte: todayStart,
        lt: todayEnd,
      },
    },
    select: {
      userId: true,
    },
  })
  return new Set(logs.map((log) => log.userId)).size
}

/**
 * 获取近7日新注册用户数
 */
export async function getSevenDaysNewUsers(sevenDaysAgo: Date) {
  return prisma.user.count({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  })
}

/**
 * 获取近7日登录用户数（去重）
 */
export async function getSevenDaysLoginUsers(sevenDaysAgo: Date) {
  const logs = await prisma.userLoginLog.findMany({
    where: {
      loginAt: {
        gte: sevenDaysAgo,
      },
    },
    select: {
      userId: true,
    },
  })
  return new Set(logs.map((log) => log.userId)).size
}

/**
 * 获取总登录次数
 */
export async function getTotalLoginCount() {
  return prisma.userLoginLog.count()
}

/**
 * 获取指定日期的注册用户数
 */
export async function getDayNewUsers(targetDate: Date, nextDate: Date) {
  return prisma.user.count({
    where: {
      createdAt: {
        gte: targetDate,
        lt: nextDate,
      },
    },
  })
}

/**
 * 获取指定日期的登录用户数（去重）
 */
export async function getDayLoginUsers(targetDate: Date, nextDate: Date) {
  const logs = await prisma.userLoginLog.findMany({
    where: {
      loginAt: {
        gte: targetDate,
        lt: nextDate,
      },
    },
    select: {
      userId: true,
    },
  })
  return new Set(logs.map((log) => log.userId)).size
}

/**
 * 获取登录记录（用于设备/地点统计）
 */
export async function getLoginLogs(startDate: Date, options?: {
  includeUserAgent?: boolean
  includeIpAddress?: boolean
}) {
  const where: any = {
    loginAt: {
      gte: startDate,
    },
  }

  if (options?.includeUserAgent) {
    where.userAgent = { not: null }
  }
  if (options?.includeIpAddress) {
    where.ipAddress = { not: null }
  }

  return prisma.userLoginLog.findMany({
    where,
    select: {
      userAgent: true,
      ipAddress: true,
      userId: true,
      loginAt: true,
      email: true,
    },
    orderBy: {
      loginAt: options?.includeUserAgent ? undefined : 'asc',
    },
  })
}

/**
 * 获取行为日志（用于行为统计）
 */
export async function getBehaviorLogs(startDate: Date, limit: number = 2000) {
  return prisma.userBehaviorLog.findMany({
    where: {
      startTime: {
        gte: startDate,
      },
    },
    select: {
      userId: true,
      email: true,
      functionName: true,
      startTime: true,
      endTime: true,
      durationSeconds: true,
    },
    orderBy: {
      startTime: 'desc',
    },
    take: limit,
  })
}

/**
 * 获取行为统计汇总
 */
export async function getBehaviorStats(startDate: Date, endDate: Date) {
  const [todayCount, sevenDaysCount, totalDuration] = await Promise.all([
    prisma.userBehaviorLog.count({
      where: {
        startTime: {
          gte: startDate,
          lt: endDate,
        },
      },
    }),
    prisma.userBehaviorLog.count({
      where: {
        startTime: {
          gte: startDate,
        },
      },
    }),
    prisma.userBehaviorLog.aggregate({
      where: {
        durationSeconds: {
          not: null,
        },
      },
      _sum: {
        durationSeconds: true,
      },
    }),
  ])

  return {
    todayCount,
    sevenDaysCount,
    totalDurationSeconds: totalDuration._sum.durationSeconds || 0,
  }
}

/**
 * 获取最近注册的用户
 */
export async function getRecentUsers(limit: number = 10) {
  return prisma.user.findMany({
    take: limit,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  })
}

/**
 * 查找下一次登录记录（用于计算会话时长）
 */
export async function findNextLogin(loginAt: Date, userId: string) {
  return prisma.userLoginLog.findFirst({
    where: {
      userId,
      loginAt: {
        gt: loginAt,
      },
    },
    orderBy: {
      loginAt: 'asc',
    },
  })
}

/**
 * 查找用户最后一次行为记录
 */
export async function findLastBehavior(userId: string) {
  return prisma.userBehaviorLog.findFirst({
    where: {
      userId,
    },
    orderBy: {
      startTime: 'desc',
    },
  })
}
