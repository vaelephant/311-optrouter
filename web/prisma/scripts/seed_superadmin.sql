-- 创建超级管理员账号
-- 登录邮箱: admin@admin.local  密码: admin  （登录页用户名可填 admin，会映射到该邮箱）
-- 执行: psql $DATABASE_URL -f web/prisma/scripts/seed_superadmin.sql
-- 或: 在 psql / 任意 SQL 客户端中执行本文件

-- 启用 pgcrypto（用于 bcrypt 密码）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 存在则更新密码与角色，不存在则插入
INSERT INTO users (id, email, password, role, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@admin.local',
  crypt('admin', gen_salt('bf', 10)),
  'superadmin',
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE SET
  password = crypt('admin', gen_salt('bf', 10)),
  role = 'superadmin',
  updated_at = now();
