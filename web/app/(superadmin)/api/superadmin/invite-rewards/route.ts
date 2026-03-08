/**
 * Superadmin 邀请奖励设置 API
 * GET /api/superadmin/invite-rewards  - 获取所有奖励规则
 * PATCH /api/superadmin/invite-rewards - 按 id 更新单条规则
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getInviteRewardRulesForAdmin,
  updateInviteRewardRuleById,
} from '@/app/(invite)/domain/invite.repo'

export async function GET() {
  try {
    const rules = await getInviteRewardRulesForAdmin()
    return NextResponse.json({
      success: true,
      data: {
        rules: rules.map((r) => ({
          id: r.id,
          inviteCount: r.inviteCount,
          rewardType: r.rewardType,
          rewardValue: r.rewardValue,
          rewardName: r.rewardName,
          rewardDescription: r.rewardDescription ?? '',
          isActive: r.isActive,
          createdAt: r.createdAt?.toISOString?.() ?? null,
          updatedAt: r.updatedAt?.toISOString?.() ?? null,
        })),
      },
    })
  } catch (error: unknown) {
    console.error('Superadmin invite-rewards GET error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '获取邀请奖励设置失败',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const id = typeof body.id === 'number' ? body.id : undefined
    if (id == null) {
      return NextResponse.json(
        { success: false, detail: '请提供规则 id' },
        { status: 400 }
      )
    }
    const rewardValue =
      typeof body.rewardValue === 'number'
        ? Math.round(body.rewardValue)
        : undefined
    const rewardName =
      typeof body.rewardName === 'string' ? body.rewardName : undefined
    const rewardDescription =
      body.rewardDescription !== undefined ? body.rewardDescription : undefined
    const isActive =
      typeof body.isActive === 'boolean' ? body.isActive : undefined
    const updated = await updateInviteRewardRuleById(id, {
      rewardValue,
      rewardName,
      rewardDescription,
      isActive,
    })
    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        inviteCount: updated.inviteCount,
        rewardType: updated.rewardType,
        rewardValue: updated.rewardValue,
        rewardName: updated.rewardName,
        rewardDescription: updated.rewardDescription ?? '',
        isActive: updated.isActive,
      },
    })
  } catch (error: unknown) {
    console.error('Superadmin invite-rewards PATCH error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '更新邀请奖励设置失败',
      },
      { status: 500 }
    )
  }
}
