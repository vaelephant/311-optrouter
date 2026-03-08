import { NextResponse } from 'next/server'
import { getModelList } from '@/lib/gateway'

export async function GET() {
  const result = await getModelList()
  
  if ('error' in result) {
    return NextResponse.json(
      { error: { message: result.error.message, type: 'gateway_error' } },
      { status: 502 }
    )
  }

  return NextResponse.json(result)
}
