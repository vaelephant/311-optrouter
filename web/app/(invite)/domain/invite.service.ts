/**
 * 邀请模块业务逻辑层
 */
import {
  findInviteCode,
  createInviteCode,
  checkInviteCodeExists,
  getUserInviteCodes,
  getInviteRelationCount,
  createInviteRelation,
  updateInviteCodeUsedCount,
  getUserInviteRelations,
  getUserInviteCount,
  getRewardRules,
  upsertPerInviteRewardRule,
  createRewardRecord,
  checkRewardRecordExists,
  getUserRewardRecords,
  getInviteStats,
  getDailyInviteStats,
  getInviteRelationForRechargeReward,
  markRechargeRewardGranted,
  getInviteRechargeRewardAmount,
} from './invite.repo'
import { prisma } from '@/lib/db'
import { Prisma } from '@prisma/client'
import type { HandleInviteCodeParams, HandleInviteCodeResult } from './invite.types'
import type { InviteCode, InvitedUser, InviteStats, DailyStat, RewardRule, MyReward } from './invite.types'

/**
 * 生成唯一邀请码
 */
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 排除易混淆字符
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * 生成邀请码
 */
export async function generateInviteCode(
  userId: string,
  maxUses: number = 999999, // 默认无限次（999999 表示无限次）
  expiresAt: string | null = null
) {
  // 确保邀请码唯一
  let code: string
  let attempts = 0
  do {
    code = generateUniqueCode()
    const exists = await checkInviteCodeExists(code)
    if (!exists) break
    attempts++
    if (attempts > 10) {
      throw new Error('生成邀请码失败，请重试')
    }
  } while (true)

  const now = new Date().toISOString()
  const inviteCode = await createInviteCode({
    code,
    userId,
    maxUses,
    expiresAt,
    createdAt: now,
  })

  return {
    id: inviteCode.id,
    code: inviteCode.code,
    max_uses: inviteCode.maxUses,
    used_count: inviteCode.usedCount,
    expires_at: inviteCode.expiresAt,
    created_at: inviteCode.createdAt,
  }
}

/**
 * 验证邀请码
 */
export async function verifyInviteCode(code: string) {
  const inviteCode = await findInviteCode(code.toUpperCase().trim())

  if (!inviteCode) {
    return {
      success: false,
      valid: false,
      detail: '邀请码不存在',
    }
  }

  // 检查是否过期
  if (inviteCode.expiresAt) {
    if (new Date() > new Date(inviteCode.expiresAt)) {
      return {
        success: false,
        valid: false,
        detail: '邀请码已过期',
      }
    }
  }

  // 检查使用次数
  const isUnlimited = inviteCode.maxUses >= 999999
  if (!isUnlimited) {
    const usedCount = await getInviteRelationCount(code)
    if (usedCount >= inviteCode.maxUses) {
      return {
        success: false,
        valid: false,
        detail: '邀请码使用次数已用完',
      }
    }
  }

  // 获取邀请人信息
  const inviter = await prisma.user.findUnique({
    where: { id: inviteCode.userId },
    select: { email: true },
  })

  return {
    success: true,
    valid: true,
    invite_code: {
      code: inviteCode.code,
      inviter_email: inviter?.email || '',
      inviter_name: null,
      max_uses: inviteCode.maxUses >= 999999 ? null : inviteCode.maxUses,
      used_count: inviteCode.usedCount,
      remaining_uses: isUnlimited ? null : inviteCode.maxUses - inviteCode.usedCount,
    },
  }
}

/**
 * 获取我的邀请码列表
 */
export async function getMyInviteCodes(userId: string): Promise<InviteCode[]> {
  const codes = await getUserInviteCodes(userId)

  return codes.map((code) => {
    const isExpired = code.expiresAt ? new Date() > new Date(code.expiresAt) : false
    const isUnlimited = code.maxUses >= 999999
    const remainingUses = isUnlimited ? null : code.maxUses - code.usedCount
    const isUsedUp = !isUnlimited && remainingUses !== null && remainingUses <= 0

    return {
      id: code.id,
      code: code.code,
      max_uses: isUnlimited ? null : code.maxUses,
      used_count: code.usedCount,
      remaining_uses: remainingUses,
      expires_at: code.expiresAt,
      created_at: code.createdAt || '',
      is_expired: isExpired,
      is_used_up: isUsedUp,
    }
  })
}

/**
 * 获取我的邀请列表
 */
export async function getMyInvites(userId: string): Promise<InvitedUser[]> {
  const relations = await getUserInviteRelations(userId)

  return relations.map((rel) => ({
    id: rel.id,
    invitee_id: rel.inviteeId,
    invitee_email: rel.invitee.email,
    invitee_name: null,
    invite_code: rel.inviteCode,
    used_at: rel.usedAt,
    invitee_created_at: rel.invitee.createdAt.toISOString(),
  }))
}

/**
 * 获取邀请统计
 */
export async function fetchInviteStats(userId: string): Promise<InviteStats> {
  return getInviteStats(userId)
}

/**
 * 获取每日邀请统计
 */
export async function fetchDailyInviteStats(userId: string, days: number = 7): Promise<DailyStat[]> {
  return getDailyInviteStats(userId, days)
}

/**
 * 获取奖励规则
 */
export async function fetchRewardRules(): Promise<RewardRule[]> {
  const rules = await getRewardRules(true)
  return rules.map((rule) => ({
    id: rule.id,
    invite_count: rule.inviteCount,
    reward_type: rule.rewardType as 'points' | 'coupon' | 'vip_days',
    reward_value: rule.rewardValue,
    reward_name: rule.rewardName,
    reward_description: rule.rewardDescription || undefined,
  }))
}

/**
 * 获取我的奖励
 */
export async function getMyRewards(userId: string): Promise<MyReward[]> {
  const records = await getUserRewardRecords(userId)

  return records.map((record) => ({
    id: record.id,
    rule_id: record.ruleId,
    invite_count: record.inviteCount,
    reward_type: record.rewardType as 'points' | 'coupon' | 'vip_days',
    reward_value: record.rewardValue,
    reward_name: record.rewardName,
    status: record.status as 'pending' | 'granted' | 'expired',
    granted_at: record.grantedAt,
    expires_at: record.expiresAt,
    created_at: record.createdAt || '',
  }))
}

/**
 * 检查并发放累计邀请奖励
 */
export async function checkAndGrantRewards(userId: string) {
  const inviteCount = await getUserInviteCount(userId)

  if (inviteCount <= 0) {
    return {
      success: true,
      message: '暂无邀请记录',
      granted_rewards: [],
    }
  }

  const rules = await getRewardRules(true)
  const applicableRules = rules.filter(
    (rule) => rule.inviteCount > 0 && rule.inviteCount <= inviteCount
  )

  const grantedRewards = []
  const now = new Date().toISOString()

  for (const rule of applicableRules) {
    const exists = await checkRewardRecordExists(userId, rule.id)
    if (exists) continue

    let expiresAt: string | null = null
    if (rule.rewardType === 'coupon') {
      const d = new Date()
      d.setDate(d.getDate() + 30)
      expiresAt = d.toISOString()
    }

    await createRewardRecord({
      userId,
      ruleId: rule.id,
      inviteCount,
      rewardType: rule.rewardType,
      rewardValue: rule.rewardValue,
      rewardName: rule.rewardName,
      status: 'granted',
      grantedAt: now,
      expiresAt,
      createdAt: now,
    })

    grantedRewards.push({
      rule_id: rule.id,
      reward_name: rule.rewardName,
      reward_type: rule.rewardType,
      reward_value: rule.rewardValue,
    })

    // TODO: 发放奖励（需要集成到实际的奖励系统）
    console.log(`发放累计邀请奖励: 用户 ${userId} 邀请 ${inviteCount} 人，获得 ${rule.rewardName}`)
  }

  return {
    success: true,
    message: grantedRewards.length > 0 ? `已发放 ${grantedRewards.length} 项奖励` : '暂无新奖励',
    granted_rewards: grantedRewards,
  }
}

/**
 * 被邀请人首次充值时，给邀请人加余额奖励（在充值事务内调用，保证原子性）
 * 仅对「未发放过首充奖励」的邀请关系发放一次。
 */
export async function grantInviteRechargeReward(
  inviteeUserId: string,
  tx: Prisma.TransactionClient
): Promise<void> {
  const relation = await getInviteRelationForRechargeReward(inviteeUserId, tx)
  if (!relation) return

  const amountDecimal = await getInviteRechargeRewardAmount(tx)
  if (amountDecimal <= 0) return

  const amount = new Prisma.Decimal(amountDecimal)
  const now = new Date()

  await tx.userBalance.upsert({
    where: { userId: relation.inviterId },
    create: {
      userId: relation.inviterId,
      balance: amount,
      updatedAt: now,
    },
    update: {
      balance: { increment: amount },
      updatedAt: now,
    },
  })

  await tx.transaction.create({
    data: {
      userId: relation.inviterId,
      amount,
      type: 'adjustment',
      description: '邀请奖励-被邀请人首充',
    },
  })

  await markRechargeRewardGranted(relation.id, now, tx)
}

/**
 * 注册时处理邀请码（从 invite-integration.ts 平移）
 */
export async function handleInviteCodeOnRegister(
  params: HandleInviteCodeParams
): Promise<HandleInviteCodeResult> {
  try {
    const code = params.inviteCodeStr.toUpperCase().trim()
    console.log('[邀请码处理] 开始处理邀请码:', { code, newUserId: params.newUserId, newUserEmail: params.newUserEmail })

    // 1. 验证邀请码
    const inviteCode = await findInviteCode(code)

    if (!inviteCode) {
      console.warn('[邀请码处理] 邀请码不存在:', code)
      return { success: false, reason: '邀请码不存在' }
    }

    console.log('[邀请码处理] 找到邀请码:', { inviteCodeId: inviteCode.id, inviterId: inviteCode.userId })

    // 检查是否过期
    if (inviteCode.expiresAt) {
      if (new Date() > new Date(inviteCode.expiresAt)) {
        return { success: false, reason: '邀请码已过期' }
      }
    }

    // 检查使用次数
    const isUnlimited = inviteCode.maxUses >= 999999
    if (!isUnlimited) {
      const usedCount = await getInviteRelationCount(code)
      if (usedCount >= inviteCode.maxUses) {
        return { success: false, reason: '邀请码使用次数已用完' }
      }
    }

    const inviterId = inviteCode.userId
    const now = new Date().toISOString()

    // 2. 创建邀请关系
    const inviteRelation = await createInviteRelation({
      inviterId,
      inviteeId: params.newUserId,
      inviteCode: code,
      usedAt: now,
    })
    console.log('[邀请码处理] 创建邀请关系成功:', { relationId: inviteRelation.id })

    // 更新邀请码使用次数
    const actualUsedCount = await getInviteRelationCount(code)
    await updateInviteCodeUsedCount(inviteCode.id, actualUsedCount)
    console.log('[邀请码处理] 更新邀请码使用次数:', { code, usedCount: actualUsedCount })

    // 3. 发放单次邀请奖励
    try {
      const perInviteRule = await upsertPerInviteRewardRule(now)

      await createRewardRecord({
        userId: inviterId,
        ruleId: perInviteRule.id,
        inviteCount: actualUsedCount,
        rewardType: 'points',
        rewardValue: perInviteRule.rewardValue,
        rewardName: perInviteRule.rewardName,
        status: 'granted',
        grantedAt: now,
        expiresAt: null,
        createdAt: now,
      })

      // TODO: 发放积分（需要集成到实际的积分系统）
      console.log(`发放积分: 用户 ${inviterId} 获得 ${perInviteRule.rewardValue} 积分 (邀请用户 ${params.newUserEmail})`)
    } catch (err) {
      console.warn('发放单次邀请奖励失败:', err)
    }

    // 4. 检查并发放累计邀请奖励
    try {
      const inviteCount = await getUserInviteCount(inviterId)

      if (inviteCount > 0) {
        const rules = await getRewardRules(true)
        const applicableRules = rules.filter(
          (rule) => rule.inviteCount > 0 && rule.inviteCount <= inviteCount
        )

        for (const rule of applicableRules) {
          const existing = await checkRewardRecordExists(inviterId, rule.id)
          if (existing) continue

          let expiresAt: string | null = null
          if (rule.rewardType === 'coupon') {
            const d = new Date()
            d.setDate(d.getDate() + 30)
            expiresAt = d.toISOString()
          }

          await createRewardRecord({
            userId: inviterId,
            ruleId: rule.id,
            inviteCount,
            rewardType: rule.rewardType,
            rewardValue: rule.rewardValue,
            rewardName: rule.rewardName,
            status: 'granted',
            grantedAt: now,
            expiresAt,
            createdAt: now,
          })

          // TODO: 发放奖励（需要集成到实际的奖励系统）
          console.log(`发放累计邀请奖励: 用户 ${inviterId} 邀请 ${inviteCount} 人，获得 ${rule.rewardName}`)
        }
      }
    } catch (err) {
      console.warn('发放累计邀请奖励失败:', err)
    }

    console.log('[邀请码处理] 处理完成，成功')
    return { success: true }
  } catch (error: any) {
    console.error('[邀请码处理] 处理失败:', error)
    console.error('[邀请码处理] 错误堆栈:', error.stack)
    return { success: false, reason: error.message || '处理邀请码失败' }
  }
}
