import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, updateLastUsed } from '@/lib/auth'
import { sendChatRequest, calculateCost } from '@/lib/gateway'
import { prisma } from '@/lib/db'

interface ChatRequestBody {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  stop?: string | string[]
  [key: string]: unknown
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  const auth = await authMiddleware(request)
  if (!auth.valid) {
    return NextResponse.json(
      { error: { message: auth.error, type: 'authentication_error' } },
      { status: auth.statusCode || 401 }
    )
  }

  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid JSON body', type: 'invalid_request_error' } },
      { status: 400 }
    )
  }

  if (!body.model) {
    return NextResponse.json(
      { error: { message: 'Missing required field: model', type: 'invalid_request_error' } },
      { status: 400 }
    )
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json(
      { error: { message: 'Missing required field: messages', type: 'invalid_request_error' } },
      { status: 400 }
    )
  }

  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') ||
                 request.headers.get('x-api-key') || ''

  let gatewayResponse: Response
  try {
    gatewayResponse = await sendChatRequest(
      {
        model: body.model,
        messages: body.messages,
        temperature: body.temperature,
        top_p: body.top_p,
        max_tokens: body.max_tokens,
        stream: body.stream,
        stop: body.stop,
      },
      apiKey
    )
  } catch (error) {
    console.error('Gateway request failed:', error)
    return NextResponse.json(
      { error: { message: 'Gateway request failed', type: 'gateway_error' } },
      { status: 502 }
    )
  }

  if (body.stream) {
    const stream = await createStreamingResponse(
      gatewayResponse.body!,
      auth.userId!,
      auth.apiKeyId!,
      body.model,
      startTime
    )

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  }

  const responseData = await gatewayResponse.json()

  const latencyMs = Date.now() - startTime
  const usage = responseData.usage

  if (usage) {
    const cost = await calculateCost(
      body.model,
      usage.prompt_tokens,
      usage.completion_tokens
    )

    await prisma.usageLog.create({
      data: {
        userId: auth.userId!,
        apiKeyId: auth.apiKeyId,
        model: body.model,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        cost,
        latencyMs,
        status: 'success',
      },
    })

    if (auth.apiKeyId) {
      await updateLastUsed(auth.apiKeyId)
    }
  }

  return NextResponse.json(responseData, {
    status: gatewayResponse.status,
  })
}

function estimateTokens(messages: Array<{ content: string }>): number {
  let totalChars = 0
  for (const msg of messages) {
    totalChars += msg.content.length
  }
  return Math.ceil(totalChars / 4)
}

async function createStreamingResponse(
  readableStream: ReadableStream<Uint8Array>,
  userId: string,
  apiKeyId: string | undefined,
  model: string,
  startTime: number
): Promise<ReadableStream<Uint8Array>> {
  const reader = readableStream.getReader()
  const decoder = new TextDecoder()

  const transformStream = new TransformStream({
    async transform(chunk, controller) {
      const text = decoder.decode(chunk, { stream: true })
      controller.enqueue(chunk)
    },
    async flush() {
      const latencyMs = Date.now() - startTime
      
      await prisma.usageLog.create({
        data: {
          userId,
          apiKeyId,
          model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          latencyMs,
          status: 'success',
        },
      }).catch(console.error)

      if (apiKeyId) {
        await updateLastUsed(apiKeyId).catch(console.error)
      }
    },
  })

  return readableStream.pipeThrough(transformStream)
}

export async function GET() {
  return NextResponse.json({
    object: 'service',
    id: 'OptRouter-chat',
    created: Math.floor(Date.now() / 1000),
    instructions: 'OptRouter API - Unified AI Gateway',
    models: 'GET /api/models',
  })
}
