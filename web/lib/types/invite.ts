/**
 * 邀请系统 TypeScript 类型定义
 */

export interface InviteCode {
  id: number
  code: string
  max_uses: number | null // null 表示无限次
  used_count: number
  remaining_uses: number | null // null 表示无限次
  expires_at: string | null
  created_at: string
  is_expired: boolean
  is_used_up: boolean
}

export interface InvitedUser {
  id: number
  invitee_id: string
  invitee_email: string
  invitee_name: string | null
  invite_code: string
  used_at: string | null
  invitee_created_at: string
}

export interface InviteStats {
  total_codes: number
  total_invites: number
  today_invites: number
  last_7_days_invites: number
}

export interface DailyStat {
  date: string // YYYY-MM-DD
  count: number
}

export interface RewardRule {
  id: number
  invite_count: number
  reward_type: 'points' | 'coupon' | 'vip_days'
  reward_value: number
  reward_name: string
  reward_description?: string | null
}

export interface MyReward {
  id: number
  rule_id: number
  invite_count: number
  reward_type: 'points' | 'coupon' | 'vip_days'
  reward_value: number
  reward_name: string
  status: 'pending' | 'granted' | 'expired'
  granted_at: string | null
  expires_at: string | null
  created_at: string
}

export interface InviteCodeVerifyResult {
  success: boolean
  valid: boolean
  detail?: string
  invite_code?: {
    code: string
    inviter_email: string
    inviter_name: string | null
    max_uses: number | null
    used_count: number
    remaining_uses: number | null
  }
}

export interface GenerateInviteCodeResponse {
  success: boolean
  invite_code?: {
    id: number
    code: string
    max_uses: number
    used_count: number
    expires_at: string | null
    created_at: string
  }
  detail?: string
}

export interface MyInviteCodesResponse {
  success: boolean
  invite_codes?: InviteCode[]
  detail?: string
}

export interface MyInvitesResponse {
  success: boolean
  invites?: InvitedUser[]
  total?: number
  detail?: string
}

export interface RewardRulesResponse {
  success: boolean
  rules?: RewardRule[]
  detail?: string
}

export interface MyRewardsResponse {
  success: boolean
  rewards?: MyReward[]
  detail?: string
}

export interface CheckRewardsResponse {
  success: boolean
  message?: string
  granted_rewards?: Array<{
    rule_id: number
    reward_name: string
    reward_type: string
    reward_value: number
  }>
  detail?: string
}
