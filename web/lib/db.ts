import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined
}

// 创建 PostgreSQL 连接池
function getPgPool(): Pool {
  if (global.pgPool) {
    return global.pgPool
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  global.pgPool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    // 远程/云数据库在 Windows 环境下偶发握手慢，2s 太激进，容易导致“connection timeout”
    connectionTimeoutMillis: 15000,
    // 常见云 Postgres 需要 SSL；若 URL 带 sslmode=require / ssl=true 或环境变量要求，则启用
    ssl:
      /(^|[?&])sslmode=require(&|$)/i.test(databaseUrl) ||
      /(^|[?&])ssl=true(&|$)/i.test(databaseUrl) ||
      process.env.PGSSLMODE === 'require' ||
      process.env.DATABASE_SSL === '1'
        ? { rejectUnauthorized: false }
        : undefined,
  })

  return global.pgPool
}

// Prisma 7.x 配置（使用 adapter）
// Prisma 7 要求提供 adapter 或 accelerateUrl
export const prisma =
  global.prisma ||
  (() => {
    const pool = getPgPool()
    const adapter = new PrismaPg(pool)
    
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  })()

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

export { prisma as default }
