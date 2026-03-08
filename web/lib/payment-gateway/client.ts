/**
 * 支付网关客户端
 * 
 * 业务系统使用此客户端调用支付网关接口
 */

import crypto from 'crypto'
import axios, { AxiosInstance } from 'axios'

export interface CreatePayOrderOptions {
  bizOrderNo: string
  amount: number
  payProvider: 'WECHAT' | 'ALIPAY'
  payMethod: 'NATIVE' | 'H5' | 'JSAPI' | 'MINIAPP' | 'APP'
  title?: string
  currency?: string
  clientType?: string
  notifyUrl?: string
  meta?: Record<string, any> | null
  appId?: string // 可选：如果支付网关需要显式传递 app_id
  appRefId?: string // 可选：如果支付网关需要 appRefId
}

export interface CreatePayOrderResponse {
  gateway_order_no: string
  qrcode_url?: string
  pay_url?: string
  pay_params?: Record<string, any>
}

export class PaymentGatewayClient {
  private baseUrl: string
  private apiKey: string
  private apiSecret: string
  private httpClient: AxiosInstance

  constructor(baseUrl: string, apiKey: string, apiSecret: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    })
  }

  /**
   * 生成签名
   * 
   * 签名算法：MD5(api_secret + timestamp + request_body)
   */
  private generateSign(timestamp: string, requestBody: string): string {
    const signString = `${this.apiSecret}${timestamp}${requestBody}`
    return crypto.createHash('md5').update(signString).digest('hex')
  }

  /**
   * 生成请求头（包含签名）
   */
  private generateHeaders(requestBody: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(16).toString('base64url')
    const sign = this.generateSign(timestamp, requestBody)

    return {
      'Content-Type': 'application/json',
      'X-Api-Key': this.apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Sign': sign,
    }
  }

  /**
   * 创建支付订单
   */
  async createPayOrder(options: CreatePayOrderOptions): Promise<CreatePayOrderResponse> {
    const {
      bizOrderNo,
      amount,
      payProvider,
      payMethod,
      title,
      currency = 'CNY',
      clientType,
      notifyUrl,
      meta,
      appId,
      appRefId,
    } = options

    const url = `${this.baseUrl}/pay/orders`

    // 构建请求体
    const requestData: Record<string, any> = {
      biz_order_no: bizOrderNo,
      amount,
      currency,
      pay_provider: payProvider,
      pay_method: payMethod,
    }

    // 如果提供了 appId，添加到请求中（支付网关可能需要）
    if (appId) {
      requestData.app = appId
    }

    // 注意：appRefId 应该由支付网关服务端从 app 字段自动关联获取
    // 如果支付网关代码有问题需要客户端传递，可以取消下面的注释
    // if (appRefId) {
    //   requestData.appRefId = appRefId
    // }

    if (title) requestData.title = title
    if (clientType) requestData.client_type = clientType
    if (notifyUrl) requestData.notify_url = notifyUrl
    
    // meta 字段：必须是有效的 JSON 对象或 null，不能是 undefined
    // 如果不提供 meta，设置为 null（而不是 undefined）
    if (meta !== undefined) {
      requestData.meta = meta
    } else {
      // 如果未提供 meta，设置为 null（支付网关可能需要）
      requestData.meta = null
    }

    const requestBody = JSON.stringify(requestData)
    const headers = this.generateHeaders(requestBody)

    // 调试日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('支付网关请求:', {
        url,
        headers: {
          ...headers,
          'X-Sign': '[已隐藏]', // 隐藏签名
        },
        body: requestData,
      })
    }

    // 发送请求
    // 注意：axios 会自动处理 JSON，但我们需要传递字符串以保持签名一致性
    try {
      const response = await this.httpClient.post<CreatePayOrderResponse>(
        url,
        requestBody, // 传递字符串
        {
          headers,
        }
      )
      return response.data
    } catch (error: any) {
      // 记录详细错误信息
      if (error.response) {
        // 服务器返回了错误响应
        const status = error.response.status
        const statusText = error.response.statusText
        const data = error.response.data
        console.error('支付网关错误响应:', {
          status,
          statusText,
          data,
          url,
          requestData,
        })
        throw new Error(`支付网关错误 (${status}): ${JSON.stringify(data)}`)
      } else if (error.request) {
        // 请求已发送但没有收到响应
        console.error('支付网关无响应:', {
          url,
          requestData,
          error: error.message,
        })
        throw new Error(`支付网关无响应: ${error.message}`)
      } else {
        // 请求配置错误
        console.error('支付网关请求配置错误:', error.message)
        throw new Error(`支付网关请求配置错误: ${error.message}`)
      }
    }
  }

  /**
   * 查询支付订单
   */
  async queryPayOrder(gatewayOrderNo: string): Promise<any> {
    const url = `${this.baseUrl}/pay/orders/${gatewayOrderNo}/status`
    const requestBody = ''
    const headers = this.generateHeaders(requestBody)

    const response = await this.httpClient.get(url, { headers })
    return response.data
  }
}

/**
 * 获取支付网关客户端实例（单例）
 */
let clientInstance: PaymentGatewayClient | null = null

export function getPaymentGatewayClient(): PaymentGatewayClient {
  if (!clientInstance) {
    const baseUrl = process.env.PAYMENT_GATEWAY_BASE_URL
    const apiKey = process.env.PAYMENT_GATEWAY_API_KEY
    const apiSecret = process.env.PAYMENT_GATEWAY_API_SECRET

    if (!baseUrl || !apiKey || !apiSecret) {
      const missing = []
      if (!baseUrl) missing.push('PAYMENT_GATEWAY_BASE_URL')
      if (!apiKey) missing.push('PAYMENT_GATEWAY_API_KEY')
      if (!apiSecret) missing.push('PAYMENT_GATEWAY_API_SECRET')
      
      throw new Error(
        `支付网关配置缺失: ${missing.join(', ')}。请在 .env 文件中设置这些环境变量。`
      )
    }

    // 验证配置格式
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      throw new Error('PAYMENT_GATEWAY_BASE_URL 必须以 http:// 或 https:// 开头')
    }

    clientInstance = new PaymentGatewayClient(baseUrl, apiKey, apiSecret)
  }

  return clientInstance
}

/**
 * 获取支付网关 App ID（如果配置了）
 */
export function getPaymentGatewayAppId(): string | undefined {
  return process.env.PAYMENT_GATEWAY_APP_ID
}

/**
 * 获取支付网关 App Ref ID（如果配置了）
 */
export function getPaymentGatewayAppRefId(): string | undefined {
  return process.env.PAYMENT_GATEWAY_APP_REF_ID
}
