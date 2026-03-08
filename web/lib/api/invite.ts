/**
 * 邀请系统 API 客户端封装
 * 
 * 适配：使用 x-user-id header 传递用户ID
 */

import { getCurrentUserId } from '@/lib/auth-client'
import type {
  InviteCode,
  InvitedUser,
  InviteCodeVerifyResult,
  GenerateInviteCodeResponse,
  MyInviteCodesResponse,
  MyInvitesResponse,
  RewardRulesResponse,
  MyRewardsResponse,
  CheckRewardsResponse,
  MyReward,
  RewardRule,
} from '@/lib/types/invite'

// 重新导出类型，方便使用
export type {
  InviteCode,
  InvitedUser,
  InviteCodeVerifyResult,
  GenerateInviteCodeResponse,
  MyInviteCodesResponse,
  MyInvitesResponse,
  RewardRulesResponse,
  MyRewardsResponse,
  CheckRewardsResponse,
  MyReward,
  RewardRule,
}

/**
 * API 基础路径
 */
const API_BASE = '/api/invite'

/**
 * 获取请求头（包含用户ID）
 */
function getHeaders(): HeadersInit {
  const userId = getCurrentUserId()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  if (userId) {
    headers['x-user-id'] = userId
  }
  return headers
}

/**
 * 生成邀请码
 * @param maxUses 最大使用次数，默认 999999 (无限次)
 * @param expiresAt 过期时间 (ISO 格式字符串)，可选
 */
export async function generateInviteCode(
  maxUses: number = 999999, // 默认无限次（999999 表示无限次）
  expiresAt?: string
): Promise<GenerateInviteCodeResponse> {
  const response = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      max_uses: maxUses,
      expires_at: expiresAt,
    }),
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '生成邀请码失败')
  }
  return data
}

/**
 * 验证邀请码（用于注册页面实时校验）
 */
export async function verifyInviteCode(code: string): Promise<InviteCodeVerifyResult> {
  const response = await fetch(`${API_BASE}/verify?code=${encodeURIComponent(code)}`, {
    method: 'GET',
  })

  const data = await response.json()
  return data
}

/**
 * 获取我的邀请码列表
 */
export async function getMyInviteCodes(): Promise<InviteCode[]> {
  const response = await fetch(`${API_BASE}/my-codes`, {
    method: 'GET',
    headers: getHeaders(),
  })

  const data: MyInviteCodesResponse = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取邀请码列表失败')
  }
  return data.invite_codes || []
}

/**
 * 获取我邀请的用户列表
 */
export async function getMyInvites(): Promise<InvitedUser[]> {
  const response = await fetch(`${API_BASE}/my-invites`, {
    method: 'GET',
    headers: getHeaders(),
  })

  const data: MyInvitesResponse = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取邀请用户列表失败')
  }
  return data.invites || []
}

/**
 * 获取邀请统计
 */
export async function getInviteStats(): Promise<{
  total_codes: number
  total_invites: number
  today_invites: number
  last_7_days_invites: number
}> {
  const response = await fetch(`${API_BASE}/stats`, {
    method: 'GET',
    headers: getHeaders(),
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取邀请统计失败')
  }
  return data.stats
}

/**
 * 获取每日邀请统计
 */
export async function getDailyStats(days: number = 7): Promise<Array<{ date: string; count: number }>> {
  const response = await fetch(`${API_BASE}/daily-stats?days=${days}`, {
    method: 'GET',
    headers: getHeaders(),
  })

  const data = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取每日邀请统计失败')
  }
  return data.daily_stats || []
}

/**
 * 获取奖励规则
 */
export async function getRewardRules(): Promise<RewardRulesResponse['rules']> {
  const response = await fetch(`${API_BASE}/reward/rules`, {
    method: 'GET',
  })

  const data: RewardRulesResponse = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取奖励规则失败')
  }
  return data.rules || []
}

/**
 * 获取我的奖励记录
 * @param status 可选过滤条件：pending | granted | expired
 */
export async function getMyRewards(status?: 'pending' | 'granted' | 'expired'): Promise<MyReward[]> {
  const url = status
    ? `${API_BASE}/reward/my-rewards?status=${encodeURIComponent(status)}`
    : `${API_BASE}/reward/my-rewards`
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  })

  const data: MyRewardsResponse = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '获取奖励记录失败')
  }
  return data.rewards || []
}

/**
 * 检查并发放奖励（触发后端自动检查累计邀请奖励）
 */
export async function checkAndGrantRewards(): Promise<CheckRewardsResponse> {
  const response = await fetch(`${API_BASE}/reward/check`, {
    method: 'POST',
    headers: getHeaders(),
  })

  const data: CheckRewardsResponse = await response.json()
  if (!data.success) {
    throw new Error(data.detail || '检查并发放奖励失败')
  }
  return data
}
