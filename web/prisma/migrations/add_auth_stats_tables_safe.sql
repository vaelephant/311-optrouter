-- ============================================================
-- 添加认证和统计功能表（安全版本）
-- 执行日期: 2026-02-28
-- 说明：此脚本会检查表是否存在，避免重复创建
-- ============================================================

-- ============================================================
-- 1. 用户登录日志表
-- ============================================================
DO $$
BEGIN
    -- 检查表是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_login_logs'
    ) THEN
        -- 创建表
        CREATE TABLE user_login_logs (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            email VARCHAR(255) NOT NULL,
            login_at TIMESTAMP NOT NULL DEFAULT NOW(),
            ip_address TEXT,
            user_agent TEXT,
            
            -- 外键约束
            CONSTRAINT fk_user_login_logs_user 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE CASCADE
        );

        -- 创建索引
        CREATE INDEX idx_user_login_logs_user_id 
            ON user_login_logs(user_id);
        CREATE INDEX idx_user_login_logs_email 
            ON user_login_logs(email);
        CREATE INDEX idx_user_login_logs_login_at 
            ON user_login_logs(login_at);

        RAISE NOTICE '表 user_login_logs 创建成功';
    ELSE
        RAISE NOTICE '表 user_login_logs 已存在，跳过创建';
    END IF;
END $$;

-- ============================================================
-- 2. 用户行为日志表
-- ============================================================
DO $$
BEGIN
    -- 检查表是否存在
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_behavior_logs'
    ) THEN
        -- 创建表
        CREATE TABLE user_behavior_logs (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL,
            email VARCHAR(255) NOT NULL,
            function_name TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            duration_seconds DOUBLE PRECISION,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            
            -- 外键约束
            CONSTRAINT fk_user_behavior_logs_user 
                FOREIGN KEY (user_id) 
                REFERENCES users(id) 
                ON DELETE CASCADE
        );

        -- 创建索引
        CREATE INDEX idx_user_behavior_logs_user_id 
            ON user_behavior_logs(user_id);
        CREATE INDEX idx_user_behavior_logs_email 
            ON user_behavior_logs(email);
        CREATE INDEX idx_user_behavior_logs_function_name 
            ON user_behavior_logs(function_name);
        CREATE INDEX idx_user_behavior_logs_start_time 
            ON user_behavior_logs(start_time);

        RAISE NOTICE '表 user_behavior_logs 创建成功';
    ELSE
        RAISE NOTICE '表 user_behavior_logs 已存在，跳过创建';
    END IF;
END $$;

-- ============================================================
-- 验证表是否创建成功
-- ============================================================
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) THEN '已存在'
        ELSE '不存在'
    END as status
FROM (VALUES 
    ('user_login_logs'),
    ('user_behavior_logs')
) AS t(table_name);
