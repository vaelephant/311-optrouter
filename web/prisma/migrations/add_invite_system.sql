-- =====================================================
-- 添加邀请系统相关表
-- =====================================================
-- 注意：此脚本适用于 users 表（表名复数，id 字段为 UUID 类型）

-- 邀请码表
CREATE TABLE IF NOT EXISTS invite_code (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,           -- 邀请码（唯一）
    user_id UUID NOT NULL,                       -- 创建者用户ID
    max_uses INTEGER DEFAULT 1,                  -- 最大使用次数（999999表示无限次）
    used_count INTEGER DEFAULT 0,                -- 已使用次数
    expires_at TEXT,                              -- 过期时间（ISO格式字符串）
    created_at TEXT,                              -- 创建时间
    CONSTRAINT fk_invite_code_user FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invite_code_code ON invite_code(code);
CREATE INDEX IF NOT EXISTS idx_invite_code_user_id ON invite_code(user_id);
COMMENT ON TABLE invite_code IS '邀请码表 - 存储用户生成的邀请码';

-- 邀请关系表
CREATE TABLE IF NOT EXISTS invite_relation (
    id SERIAL PRIMARY KEY,
    inviter_id UUID NOT NULL,                    -- 邀请人ID
    invitee_id UUID NOT NULL,                    -- 被邀请人ID
    invite_code VARCHAR(32) NOT NULL,            -- 使用的邀请码
    used_at TEXT,                                 -- 使用时间
    CONSTRAINT fk_invite_relation_inviter FOREIGN KEY (inviter_id) REFERENCES "users"(id) ON DELETE CASCADE,
    CONSTRAINT fk_invite_relation_invitee FOREIGN KEY (invitee_id) REFERENCES "users"(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_invite_relation_inviter_id ON invite_relation(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invite_relation_invitee_id ON invite_relation(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invite_relation_code ON invite_relation(invite_code);
COMMENT ON TABLE invite_relation IS '邀请关系表 - 记录邀请人和被邀请人的关系';

-- 邀请奖励规则表
CREATE TABLE IF NOT EXISTS invite_reward_rule (
    id SERIAL PRIMARY KEY,
    invite_count INTEGER NOT NULL UNIQUE,        -- 邀请人数阈值
    reward_type VARCHAR(20) NOT NULL,            -- 奖励类型：points / coupon / vip_days
    reward_value INTEGER NOT NULL,               -- 奖励数值
    reward_name TEXT NOT NULL,                    -- 奖励名称
    reward_description TEXT,                      -- 奖励描述
    is_active BOOLEAN DEFAULT TRUE,              -- 是否启用
    created_at TEXT,                              -- 创建时间
    updated_at TEXT,                              -- 更新时间
    CONSTRAINT chk_reward_type CHECK (reward_type IN ('points', 'coupon', 'vip_days'))
);
CREATE INDEX IF NOT EXISTS idx_invite_reward_rule_count ON invite_reward_rule(invite_count);
CREATE INDEX IF NOT EXISTS idx_invite_reward_rule_active ON invite_reward_rule(is_active);
COMMENT ON TABLE invite_reward_rule IS '邀请奖励规则表 - 定义不同邀请人数对应的奖励';

-- 用户邀请奖励记录表
CREATE TABLE IF NOT EXISTS invite_reward_record (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL,                       -- 获得奖励的用户ID
    rule_id INTEGER NOT NULL,                    -- 关联的奖励规则ID
    invite_count INTEGER NOT NULL,               -- 达到的邀请人数
    reward_type VARCHAR(20) NOT NULL,            -- 奖励类型
    reward_value INTEGER NOT NULL,               -- 奖励数值
    reward_name TEXT NOT NULL,                    -- 奖励名称
    status VARCHAR(20) DEFAULT 'pending',        -- 状态：pending / granted / expired
    granted_at TEXT,                              -- 发放时间
    expires_at TEXT,                              -- 过期时间
    created_at TEXT,                              -- 创建时间
    CONSTRAINT fk_reward_record_user FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
    CONSTRAINT fk_reward_record_rule FOREIGN KEY (rule_id) REFERENCES invite_reward_rule(id) ON DELETE RESTRICT,
    CONSTRAINT chk_reward_record_type CHECK (reward_type IN ('points', 'coupon', 'vip_days')),
    CONSTRAINT chk_reward_record_status CHECK (status IN ('pending', 'granted', 'expired'))
);
CREATE INDEX IF NOT EXISTS idx_invite_reward_record_user_id ON invite_reward_record(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_reward_record_rule_id ON invite_reward_record(rule_id);
CREATE INDEX IF NOT EXISTS idx_invite_reward_record_status ON invite_reward_record(status);
CREATE INDEX IF NOT EXISTS idx_invite_reward_record_created_at ON invite_reward_record(created_at);
COMMENT ON TABLE invite_reward_record IS '用户邀请奖励记录表 - 记录用户获得的邀请奖励';

-- =====================================================
-- 初始化默认奖励规则（示例数据，可根据需要修改）
-- =====================================================
INSERT INTO invite_reward_rule (invite_count, reward_type, reward_value, reward_name, reward_description, is_active, created_at)
VALUES
    (1, 'points', 100, '100积分', '邀请1人注册获得100积分', TRUE, NOW()::TEXT),
    (5, 'points', 500, '500积分', '邀请5人注册获得500积分', TRUE, NOW()::TEXT),
    (10, 'points', 1000, '1000积分', '邀请10人注册获得1000积分', TRUE, NOW()::TEXT),
    (20, 'points', 2000, '2000积分', '邀请20人注册获得2000积分', TRUE, NOW()::TEXT),
    (50, 'points', 5000, '5000积分', '邀请50人注册获得5000积分', TRUE, NOW()::TEXT)
ON CONFLICT (invite_count) DO NOTHING;
