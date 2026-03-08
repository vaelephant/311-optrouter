/**
 * 认证模块数据访问层
 */
import { prisma } from '@/lib/db'
import type { LoginLogData } from './auth.types'

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  })
}

/**
 * 检查邮箱是否已存在
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  return !!user
}

/**
 * 创建新用户
 */
export async function createUser(data: {
  email: string
  password: string
  role?: string
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      role: data.role || 'user',
    },
  })
}

/**
 * 更新用户最后登录时间
 */
export async function updateUserLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
  })
}

/**
 * 创建登录日志
 */
export async function createLoginLog(data: LoginLogData) {
  return prisma.userLoginLog.create({
    data: {
      userId: data.userId,
      email: data.email,
      loginAt: data.loginAt,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    },
  })
}
