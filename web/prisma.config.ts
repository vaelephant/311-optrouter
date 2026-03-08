import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return env('DATABASE_URL')
  const host = process.env.DB_HOST ?? 'localhost'
  const port = process.env.DB_PORT ?? '5432'
  const user = process.env.DB_USER ?? 'postgres'
  const password = process.env.DB_PASSWORD ?? ''
  const name = process.env.DB_NAME ?? 'postgres'
  const enc = encodeURIComponent
  return `postgresql://${enc(user)}:${enc(password)}@${host}:${port}/${name}`
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
