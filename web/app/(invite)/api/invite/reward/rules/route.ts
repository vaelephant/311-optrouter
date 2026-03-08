/**
 * 获取奖励规则 API Route
 * GET /api/invite/reward/rules
 */
import { NextRequest, NextResponse } from 'next/server'
import { fetchRewardRules } from '@/app/(invite)/domain/invite.service'

export async function GET(_request: NextRequest) {
  try {
    const rules = await fetchRewardRules()

    return NextResponse.json({
      success: true,
      rules,
    })
  } catch (error: any) {
    console.error('查询奖励规则失败:', error)
    return NextResponse.json(
      { success: false, detail: error.message || '查询奖励规则失败' },
      { status: 500 }
    )
  }
}
