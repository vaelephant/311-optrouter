-- ============================================================
-- 回滚脚本：删除认证和统计功能表
-- 警告：此操作会删除所有相关数据，请谨慎执行！
-- ============================================================

-- ============================================================
-- 删除表（按依赖关系顺序）
-- ============================================================

-- 1. 删除用户行为日志表
DROP TABLE IF EXISTS user_behavior_logs CASCADE;

-- 2. 删除用户登录日志表
DROP TABLE IF EXISTS user_login_logs CASCADE;

-- ============================================================
-- 验证表是否已删除
-- ============================================================
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN '仍存在'
        ELSE '已删除'
    END as status
FROM (VALUES 
    ('user_login_logs'),
    ('user_behavior_logs')
) AS t(table_name);
