/**
 * 认证模块业务逻辑层
 */
import { hashPassword, verifyPassword, validateEmail, createSimpleToken } from '@/lib/auth-utils'
import {
  findUserByEmail,
  checkEmailExists,
  createUser,
  updateUserLastLogin,
  createLoginLog,
} from './auth.repo'
import type {
  LoginParams,
  RegisterParams,
  LoginResult,
  RegisterResult,
  AuthError,
  LoginLogData,
} from './auth.types'

/**
 * 提取 IP 地址（从 Request Headers）
 */
function extractIpAddress(headers: {
  get: (key: string) => string | null
}): string | null {
  const forwarded = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfIp = headers.get('cf-connecting-ip')
  const clientIp = headers.get('x-client-ip')

  let ipAddress = forwarded?.split(',').map(ip => ip.trim()).find(ip => ip) || null
  if (!ipAddress) {
    ipAddress = realIp?.trim() || cfIp?.trim() || clientIp?.trim() || null
  }

  // 清理IP地址（移除端口号）
  if (ipAddress) {
    ipAddress = ipAddress.replace(/^\[|\]$/g, '')
    if (ipAddress.includes(':') && !ipAddress.startsWith('::')) {
      const parts = ipAddress.split(':')
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        ipAddress = parts[0]
      }
    }
  }

  return ipAddress
}

/**
 * 用户登录
 */
export async function loginUser(
  params: LoginParams,
  headers: { get: (key: string) => string | null }
): Promise<LoginResult | AuthError> {
  try {
    // 验证邮箱格式（超级管理员允许使用 "admin" 作为用户名，映射为 admin@admin.local）
    let trimmedEmail = params.email?.trim().toLowerCase()
    if (trimmedEmail === 'admin') {
      trimmedEmail = 'admin@admin.local'
    }
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      return {
        success: false,
        detail: '邮箱格式不正确',
      }
    }

    // 查找用户
    const user = await findUserByEmail(trimmedEmail)
    if (!user) {
      return {
        success: false,
        detail: '邮箱或密码错误',
      }
    }

    // 验证密码
    if (!user.password) {
      return {
        success: false,
        detail: '该账户未设置密码，请先设置密码',
      }
    }

    const isPasswordValid = await verifyPassword(params.password, user.password)
    if (!isPasswordValid) {
      return {
        success: false,
        detail: '邮箱或密码错误',
      }
    }

    // 更新最后登录时间
    await updateUserLastLogin(user.id)

    // 记录登录日志
    const ipAddress = extractIpAddress(headers)
    const userAgent = headers.get('user-agent') || null

    await createLoginLog({
      userId: user.id,
      email: trimmedEmail,
      loginAt: new Date(),
      ipAddress,
      userAgent,
    })

    // 生成 Token
    const token = createSimpleToken(user.id, trimmedEmail)

    return {
      success: true,
      message: '登录成功',
      token,
      userId: user.id,
      email: trimmedEmail,
    }
  } catch (error: any) {
    console.error('登录失败:', error)
    return {
      success: false,
      detail: error.message || '登录失败，请稍后重试',
    }
  }
}

/**
 * 用户注册
 */
export async function registerUser(
  params: RegisterParams,
  onInviteCodeProcess?: (userId: string, email: string, inviteCode: string) => Promise<void>
): Promise<RegisterResult | AuthError> {
  try {
    // 验证邮箱格式
    const trimmedEmail = params.email?.trim().toLowerCase()
    if (!trimmedEmail || !validateEmail(trimmedEmail)) {
      return {
        success: false,
        detail: '邮箱格式不正确',
      }
    }

    // 验证密码长度
    if (!params.password || params.password.length < 6) {
      return {
        success: false,
        detail: '密码长度至少为6位',
      }
    }

    // 检查用户是否已存在
    const emailExists = await checkEmailExists(trimmedEmail)
    if (emailExists) {
      return {
        success: false,
        detail: '该邮箱已注册',
      }
    }

    // 创建新用户
    const passwordHash = await hashPassword(params.password)
    const user = await createUser({
      email: trimmedEmail,
      password: passwordHash,
      role: 'user',
    })

    // 处理邀请码（如果提供了）
    if (params.inviteCode && onInviteCodeProcess) {
      try {
        await onInviteCodeProcess(user.id, trimmedEmail, params.inviteCode)
      } catch (inviteError: any) {
        console.error('[注册] 邀请码处理异常:', inviteError)
        // 邀请码处理异常不影响注册，只记录错误
      }
    }

    // 生成 Token
    const token = createSimpleToken(user.id, trimmedEmail)

    return {
      success: true,
      message: '注册成功',
      userId: user.id,
      token,
      email: trimmedEmail,
    }
  } catch (error: any) {
    console.error('注册失败:', error)
    return {
      success: false,
      detail: error.message || '注册失败，请稍后重试',
    }
  }
}
