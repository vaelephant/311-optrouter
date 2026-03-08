-- ============================================================
-- 添加认证和统计功能表
-- 执行日期: 2026-02-28
-- ============================================================

-- ============================================================
-- 1. 用户登录日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_login_logs (
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
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id 
    ON user_login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_email 
    ON user_login_logs(email);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_login_at 
    ON user_login_logs(login_at);

-- ============================================================
-- 2. 用户行为日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS user_behavior_logs (
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
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_id 
    ON user_behavior_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_email 
    ON user_behavior_logs(email);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_function_name 
    ON user_behavior_logs(function_name);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_start_time 
    ON user_behavior_logs(start_time);

-- ============================================================
-- 验证表是否创建成功
-- ============================================================
-- 可以执行以下查询验证：
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('user_login_logs', 'user_behavior_logs');
