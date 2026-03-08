/**
 * 邀请模块数据访问层
 */
import { prisma } from '@/lib/db'

/**
 * 查找邀请码
 */
export async function findInviteCode(code: string) {
  return prisma.inviteCode.findUnique({
    where: { code },
  })
}

/**
 * 创建邀请码
 */
export async function createInviteCode(data: {
  code: string
  userId: string
  maxUses: number
  expiresAt: string | null
  createdAt: string
}) {
  return prisma.inviteCode.create({
    data: {
      code: data.code,
      userId: data.userId,
      maxUses: data.maxUses,
      usedCount: 0,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt,
    },
  })
}

/**
 * 检查邀请码是否存在
 */
export async function checkInviteCodeExists(code: string): Promise<boolean> {
  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
    select: { id: true },
  })
  return !!inviteCode
}

/**
 * 获取用户的邀请码列表
 */
export async function getUserInviteCodes(userId: string) {
  return prisma.inviteCode.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 获取邀请关系数量（用于检查使用次数）
 */
export async function getInviteRelationCount(inviteCode: string) {
  return prisma.inviteRelation.count({
    where: { inviteCode },
  })
}

/**
 * 创建邀请关系
 */
export async function createInviteRelation(data: {
  inviterId: string
  inviteeId: string
  inviteCode: string
  usedAt: string
}) {
  return prisma.inviteRelation.create({
    data: {
      inviterId: data.inviterId,
      inviteeId: data.inviteeId,
      inviteCode: data.inviteCode,
      usedAt: data.usedAt,
    },
  })
}

/**
 * 更新邀请码使用次数
 */
export async function updateInviteCodeUsedCount(inviteCodeId: number, usedCount: number) {
  return prisma.inviteCode.update({
    where: { id: inviteCodeId },
    data: { usedCount },
  })
}

/**
 * 获取邀请首充奖励金额（元），从 invite_reward_rule 读取
 * 约定：invite_count=0 且 reward_type='balance' 表示该规则，reward_value 直接为金额（元）
 * 若未配置或未启用则返回 0
 */
export async function getInviteRechargeRewardAmount(
  tx?: Pick<typeof prisma, 'inviteRewardRule'>
): Promise<number> {
  const client = tx ?? prisma
  const row = await client.inviteRewardRule.findUnique({
    where: { inviteCount: 0 },
    select: { rewardType: true, rewardValue: true, isActive: true },
  })
  if (!row || !row.isActive || row.rewardType !== 'balance') return 0
  return row.rewardValue
}

/**
 * 获取「被邀请人首充」奖励规则（供 superadmin 设置页使用）
 */
export async function getRechargeRewardRuleForAdmin() {
  return prisma.inviteRewardRule.findUnique({
    where: { inviteCount: 0 },
    select: { id: true, inviteCount: true, rewardType: true, rewardValue: true, rewardName: true, isActive: true },
  })
}

/**
 * 获取所有邀请奖励规则（供 superadmin 列表/编辑）
 */
export async function getInviteRewardRulesForAdmin() {
  return prisma.inviteRewardRule.findMany({
    orderBy: { inviteCount: 'asc' },
    select: {
      id: true,
      inviteCount: true,
      rewardType: true,
      rewardValue: true,
      rewardName: true,
      rewardDescription: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

/**
 * 按 id 更新单条邀请奖励规则
 */
export async function updateInviteRewardRuleById(
  id: number,
  data: { rewardValue?: number; rewardName?: string; rewardDescription?: string | null; isActive?: boolean }
) {
  const updateData: Record<string, unknown> = {}
  if (typeof data.rewardValue === 'number') updateData.rewardValue = data.rewardValue
  if (typeof data.rewardName === 'string') updateData.rewardName = data.rewardName
  if (data.rewardDescription !== undefined) updateData.rewardDescription = data.rewardDescription
  if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive
  if (Object.keys(updateData).length === 0) {
    return prisma.inviteRewardRule.findUnique({ where: { id } })
  }
  return prisma.inviteRewardRule.update({
    where: { id },
    data: updateData,
  })
}

/**
 * 更新「被邀请人首充」奖励规则（reward_value 单位：元）
 */
export async function updateRechargeRewardRuleForAdmin(data: { rewardValue?: number; isActive?: boolean }) {
  const updateData: { rewardValue?: number; isActive?: boolean } = {}
  if (typeof data.rewardValue === 'number') updateData.rewardValue = data.rewardValue
  if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive
  if (Object.keys(updateData).length === 0) {
    return prisma.inviteRewardRule.findUnique({ where: { inviteCount: 0 } })
  }
  return prisma.inviteRewardRule.update({
    where: { inviteCount: 0 },
    data: updateData,
  })
}

/**
 * 获取用户的邀请关系列表
 */
export async function getUserInviteRelations(userId: string) {
  return prisma.inviteRelation.findMany({
    where: { inviterId: userId },
    orderBy: { id: 'desc' }, // 改为按 id 降序，因为 usedAt 可能为 null
    include: {
      invitee: {
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      },
    },
  })
}

/**
 * 查询可发放「被邀请人首充」奖励的邀请关系（未发放过且 invitee 为指定用户）
 * 用于在 invitee 首次充值时给 inviter 加余额
 */
export async function getInviteRelationForRechargeReward(
  inviteeUserId: string,
  tx?: Pick<typeof prisma, 'inviteRelation'>
) {
  const client = tx ?? prisma
  return client.inviteRelation.findFirst({
    where: {
      inviteeId: inviteeUserId,
      rechargeRewardGrantedAt: null,
    },
    orderBy: { id: 'asc' },
  })
}

/**
 * 标记邀请关系已发放被邀请人首充奖励
 */
export async function markRechargeRewardGranted(
  relationId: number,
  grantedAt: Date,
  tx?: Pick<typeof prisma, 'inviteRelation'>
) {
  const client = tx ?? prisma
  return client.inviteRelation.update({
    where: { id: relationId },
    data: { rechargeRewardGrantedAt: grantedAt },
  })
}

/**
 * 获取用户的邀请数量
 */
export async function getUserInviteCount(userId: string) {
  return prisma.inviteRelation.count({
    where: { inviterId: userId },
  })
}

/**
 * 获取奖励规则列表
 */
export async function getRewardRules(activeOnly: boolean = true) {
  const where = activeOnly ? { isActive: true } : {}
  return prisma.inviteRewardRule.findMany({
    where,
    orderBy: { inviteCount: 'asc' },
  })
}

/**
 * 获取或创建单次邀请奖励规则
 */
export async function upsertPerInviteRewardRule(now: string) {
  return prisma.inviteRewardRule.upsert({
    where: { inviteCount: -1 },
    update: {
      rewardType: 'points',
      rewardValue: 100,
      rewardName: '邀请成功奖励100积分',
      rewardDescription: '每成功邀请一位好友注册，立即获得 100 积分',
      isActive: true,
      updatedAt: now,
    },
    create: {
      inviteCount: -1,
      rewardType: 'points',
      rewardValue: 100,
      rewardName: '邀请成功奖励100积分',
      rewardDescription: '每成功邀请一位好友注册，立即获得 100 积分',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  })
}

/**
 * 创建奖励记录
 */
export async function createRewardRecord(data: {
  userId: string
  ruleId: number
  inviteCount: number
  rewardType: string
  rewardValue: number
  rewardName: string
  status: string
  grantedAt: string | null
  expiresAt: string | null
  createdAt: string
}) {
  return prisma.inviteRewardRecord.create({
    data,
  })
}

/**
 * 检查奖励记录是否存在
 */
export async function checkRewardRecordExists(userId: string, ruleId: number): Promise<boolean> {
  const record = await prisma.inviteRewardRecord.findFirst({
    where: { userId, ruleId },
    select: { id: true },
  })
  return !!record
}

/**
 * 获取用户的奖励记录
 */
export async function getUserRewardRecords(userId: string) {
  return prisma.inviteRewardRecord.findMany({
    where: { userId },
    include: {
      rewardRule: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * 获取邀请统计（今日、近7日）
 */
export async function getInviteStats(userId: string) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const todayEnd = new Date(todayStart)
  todayEnd.setDate(todayEnd.getDate() + 1)
  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  const totalCodes = await prisma.inviteCode.count({
    where: { userId },
  })

  const totalInvites = await prisma.inviteRelation.count({
    where: { inviterId: userId },
  })

  const todayInvites = await prisma.inviteRelation.count({
    where: {
      inviterId: userId,
      usedAt: {
        gte: todayStart.toISOString(),
        lt: todayEnd.toISOString(),
      },
    },
  })

  const last7DaysInvites = await prisma.inviteRelation.count({
    where: {
      inviterId: userId,
      usedAt: {
        gte: sevenDaysAgo.toISOString(),
      },
    },
  })

  return {
    total_codes: totalCodes,
    total_invites: totalInvites,
    today_invites: todayInvites,
    last_7_days_invites: last7DaysInvites,
  }
}

/**
 * 获取每日邀请统计
 */
export async function getDailyInviteStats(userId: string, days: number = 7) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const startDate = new Date(todayStart)
  startDate.setDate(startDate.getDate() - days + 1)

  const relations = await prisma.inviteRelation.findMany({
    where: {
      inviterId: userId,
      usedAt: {
        gte: startDate.toISOString(),
      },
    },
    select: {
      usedAt: true,
    },
  })

  const dailyStats: Record<string, number> = {}
  relations.forEach((rel) => {
    if (rel.usedAt) {
      const dateKey = rel.usedAt.split('T')[0]
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1
    }
  })

  return Object.entries(dailyStats).map(([date, count]) => ({
    date,
    count,
  }))
}
