const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:9113'
const REQUEST_TIMEOUT = 60000

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  name?: string
}

export interface ChatRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
  stop?: string | string[]
}

export interface ChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface TokenStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
}

export async function sendChatRequest(
  request: ChatRequest,
  apiKey: string
): Promise<Response> {
  const url = `${GATEWAY_URL}/v1/chat/completions`
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  })

  return response
}

export async function getModelList(): Promise<{ models: string[] } | { error: { message: string } }> {
  const url = `${GATEWAY_URL}/v1/models`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      return { error: { message: 'Failed to fetch models' } }
    }

    return await response.json()
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch model list',
      },
    }
  }
}

export async function getModelPricing(modelName: string): Promise<{
  modelName: string
  inputCost: number
  outputCost: number
  provider: string
} | { error: { message: string } }> {
  const url = `${GATEWAY_URL}/v1/models/${modelName}/pricing`
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    })

    if (!response.ok) {
      return { error: { message: 'Failed to fetch pricing' } }
    }

    return await response.json()
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch pricing',
      },
    }
  }
}

export async function calculateCost(
  modelName: string,
  inputTokens: number,
  outputTokens: number
): Promise<number> {
  const pricing = await getModelPricing(modelName)
  
  if ('error' in pricing) {
    return (inputTokens + outputTokens) * 0.00001
  }

  const cost = (
    (inputTokens * pricing.inputCost) +
    (outputTokens * pricing.outputCost)
  ) / 1_000_000

  return cost
}

export async function checkGatewayHealth(): Promise<{
  status: 'healthy' | 'unhealthy'
  latencyMs?: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const response = await fetch(`${GATEWAY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    })

    const latencyMs = Date.now() - startTime

    if (response.ok) {
      return {
        status: 'healthy',
        latencyMs,
      }
    }

    return {
      status: 'unhealthy',
      latencyMs,
      error: `Gateway returned status ${response.status}`,
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/** GET /health/models 返回：各模型对应上游是否可访问及探测响应时间 */
export interface HealthModelItem {
  model: string
  provider: string
  status: 'ok' | 'no_key' | 'auth_failed' | 'unreachable'
  latency_ms: number
}

export async function getHealthModels(): Promise<
  { models: HealthModelItem[] } | { error: { message: string } }
> {
  try {
    const response = await fetch(`${GATEWAY_URL}/health/models`, {
      method: 'GET',
      signal: AbortSignal.timeout(20000),
    })
    if (!response.ok) {
      return { error: { message: `Gateway returned ${response.status}` } }
    }
    return await response.json()
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Failed to fetch health/models',
      },
    }
  }
}
