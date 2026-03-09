import { defineConfig, env } from 'prisma/config'
import * as dotenv from 'dotenv'
import path from 'path'

// 显式加载当前目录下的 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

function getDatabaseUrl(): string {
  // 优先使用完整的 DATABASE_URL
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL
  }
  
  // 备选：手动拼接
  const host = process.env.DB_HOST ?? 'localhost'
  const port = process.env.DB_PORT ?? '5432'
  const user = process.env.DB_USER ?? 'postgres'
  const password = process.env.DB_PASSWORD ?? ''
  const name = process.env.DB_NAME ?? 'postgres'
  
  const enc = encodeURIComponent
  return `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${name}?schema=public`
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: getDatabaseUrl(),
  },
})
