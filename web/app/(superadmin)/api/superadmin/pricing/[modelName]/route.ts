/**
 * 更新模型定价（含改名）
 * PATCH /api/superadmin/pricing/[modelName]
 * body: { inputPrice?, outputPrice?, enabled?, newModelName? }
 * 当提供 newModelName 且与当前不同时，先重命名再应用其余字段
 */
import { NextRequest, NextResponse } from 'next/server'
import { updateModelPricing, renameModelPricing } from '@/app/(superadmin)/domain/superadmin.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ modelName: string }> }
) {
  try {
    const { modelName: currentName } = await params
    if (!currentName) {
      return NextResponse.json(
        { success: false, detail: '缺少 modelName' },
        { status: 400 }
      )
    }
    const body = await request.json()
    const newModelName =
      typeof body.newModelName === 'string' ? body.newModelName.trim() : undefined
    const inputPrice = body.inputPrice != null ? Number(body.inputPrice) : undefined
    const outputPrice = body.outputPrice != null ? Number(body.outputPrice) : undefined
    const enabled = body.enabled

    let targetName = currentName
    if (newModelName && newModelName !== currentName) {
      await renameModelPricing(currentName, newModelName)
      targetName = newModelName
    }

    const hasUpdates =
      inputPrice !== undefined ||
      outputPrice !== undefined ||
      (typeof enabled === 'boolean')
    if (hasUpdates) {
      await updateModelPricing(targetName, {
        ...(inputPrice !== undefined && { inputPrice }),
        ...(outputPrice !== undefined && { outputPrice }),
        ...(typeof enabled === 'boolean' && { enabled }),
      })
    }

    if (!newModelName && !hasUpdates) {
      return NextResponse.json(
        { success: false, detail: '请提供 newModelName、inputPrice、outputPrice 或 enabled' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, modelName: targetName })
  } catch (error: unknown) {
    console.error('Superadmin pricing update error:', error)
    return NextResponse.json(
      {
        success: false,
        detail: error instanceof Error ? error.message : '更新失败',
      },
      { status: 500 }
    )
  }
}
