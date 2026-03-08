import { NextRequest, NextResponse } from 'next/server'
import { isValidUUID } from '@/lib/auth-utils'
import { fetchUserStats } from '@/app/(admin)/domain/admin.service'

function getCurrentUserId(request: NextRequest): string | null {
  const userId = request.headers.get('x-user-id')
  return userId
}

export async function GET(request: NextRequest) {
  try {
    const userId = getCurrentUserId(request)
    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, detail: 'Authentication required' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7', 10)

    const stats = await fetchUserStats({ days })

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    console.error('Failed to fetch user statistics:', error)
    return NextResponse.json(
      { success: false, detail: error.message || 'Failed to fetch user statistics' },
      { status: 500 }
    )
  }
}
