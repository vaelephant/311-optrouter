/**
 * 创建超级管理员账号
 * 运行: cd web && npx tsx prisma/seed-superadmin.ts
 * 或: cd web && npx ts-node --compiler-options '{"module":"CommonJS","moduleResolution":"node"}' prisma/seed-superadmin.ts
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const SUPERADMIN_EMAIL = 'admin@admin.local'
const SUPERADMIN_PASSWORD = 'admin'
const SUPERADMIN_ROLE = 'superadmin'

async function main() {
  const prisma = new PrismaClient()
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10)

  const user = await prisma.user.upsert({
    where: { email: SUPERADMIN_EMAIL },
    create: {
      email: SUPERADMIN_EMAIL,
      password: passwordHash,
      role: SUPERADMIN_ROLE,
    },
    update: {
      password: passwordHash,
      role: SUPERADMIN_ROLE,
    },
  })

  console.log('Superadmin account ready:')
  console.log('  Email (登录邮箱):', SUPERADMIN_EMAIL)
  console.log('  Password (密码):', SUPERADMIN_PASSWORD)
  console.log('  Role:', user.role)
  console.log('  User ID:', user.id)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
