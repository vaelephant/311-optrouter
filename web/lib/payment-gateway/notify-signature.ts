/**
 * 通知签名验证工具
 * 
 * 业务系统使用此工具验证网关发送的通知签名
 */

import crypto from 'crypto'

/**
 * 生成通知签名（与网关端算法一致）
 * 
 * 签名算法：
 * 1. 将字典按key排序
 * 2. 排除sign字段
 * 3. 拼接成 "key1=value1&key2=value2" 格式
 * 4. 前面加上 api_secret
 * 5. MD5加密
 */
export function generateNotifySign(apiSecret: string, data: Record<string, any>): string {
  const sortedKeys = Object.keys(data).sort()
  const signString = sortedKeys
    .filter(key => key !== 'sign')
    .map(key => `${key}=${data[key]}`)
    .join('&')
  
  const fullSignString = `${apiSecret}${signString}`
  return crypto.createHash('md5').update(fullSignString).digest('hex')
}

/**
 * 验证通知签名
 * 
 * 业务系统收到网关通知后，使用此函数验证签名
 * 
 * @throws {Error} 签名验证失败
 */
export function verifyNotifySign(apiSecret: string, data: Record<string, any>, sign: string): boolean {
  const expectedSign = generateNotifySign(apiSecret, data)
  
  // 安全的字符串比较（防止时序攻击）
  if (sign.length !== expectedSign.length) {
    throw new Error('签名长度不匹配')
  }
  
  let result = 0
  for (let i = 0; i < sign.length; i++) {
    result |= sign.charCodeAt(i) ^ expectedSign.charCodeAt(i)
  }
  
  if (result !== 0) {
    throw new Error(`签名验证失败: 期望=${expectedSign}, 实际=${sign}`)
  }
  
  return true
}
