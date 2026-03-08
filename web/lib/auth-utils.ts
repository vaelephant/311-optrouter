/**
 * 认证相关工具函数
 * 适配：邮箱登录、UUID 用户ID
 */
import bcrypt from 'bcryptjs';

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 加密密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * 生成简单的 Token（不依赖 JWT）
 * 使用 Base64 编码用户ID和邮箱 + 时间戳
 */
export function createSimpleToken(userId: string, email: string): string {
  const payload = {
    userId: userId,
    email: email,
    timestamp: Date.now(),
  };
  // 使用 Base64 编码（仅用于标识，不包含敏感信息）
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 解析 Token（简单实现）
 */
export function parseToken(token: string): { userId: string; email: string; timestamp: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    return {
      userId: payload.userId,
      email: payload.email,
      timestamp: payload.timestamp,
    };
  } catch {
    return null;
  }
}

/**
 * 生成6位数字验证码（预留功能）
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * UUID 格式验证
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}
