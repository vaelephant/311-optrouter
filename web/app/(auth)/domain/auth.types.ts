/**
 * 认证模块类型定义
 */

export interface LoginParams {
  email: string
  password: string
}

export interface RegisterParams {
  email: string
  password: string
  inviteCode?: string
}

export interface LoginResult {
  success: true
  userId: string
  email: string
  token: string
  message: string
}

export interface RegisterResult {
  success: true
  userId: string
  email: string
  token: string
  message: string
}

export interface AuthError {
  success: false
  detail: string
}

export type AuthResult<T> = T | AuthError

export interface LoginLogData {
  userId: string
  email: string
  loginAt: Date
  ipAddress: string | null
  userAgent: string | null
}
