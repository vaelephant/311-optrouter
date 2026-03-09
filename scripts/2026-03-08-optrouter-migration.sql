-- ==============================================================================
-- OptRouter 智能分层路由 - 数据库迁移脚本 (终极修复版 v3)
-- ==============================================================================
-- 注意：如果遇到 "transaction is aborted" 错误，请先执行一次 ROLLBACK;
-- ==============================================================================

-- 先尝试结束之前的失败事务
ROLLBACK; 

BEGIN;

-- 1. 扩展 usage_logs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='usage_logs' AND column_name='saved_cost') THEN
        ALTER TABLE usage_logs ADD COLUMN saved_cost NUMERIC(10,6) DEFAULT 0;
    END IF;
END $$;

-- 2. 修复并扩展 model_pricing
-- A. 确保 provider 字段存在且有默认值
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='model_pricing' AND column_name='provider') THEN
        ALTER TABLE model_pricing ADD COLUMN provider TEXT DEFAULT 'openai';
    ELSE
        ALTER TABLE model_pricing ALTER COLUMN provider SET DEFAULT 'openai';
    END IF;
END $$;

-- B. 立即填充 NULL 的 provider，防止后续非空约束失败
UPDATE model_pricing SET provider = 'openai' WHERE provider IS NULL;

-- C. 强制非空约束
ALTER TABLE model_pricing ALTER COLUMN provider SET NOT NULL;

-- D. 添加其它所有字段
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS provider_url TEXT;
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'balanced';
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS capability JSONB DEFAULT '{}'::jsonb;
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT true;
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS fallback_model TEXT;
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS fallback_provider TEXT;
ALTER TABLE model_pricing ADD COLUMN IF NOT EXISTS fallback_provider_url TEXT;

-- 3. 插入/更新数据（显式包含所有非空字段）
-- 虚拟模型
INSERT INTO model_pricing (model_name, input_price, output_price, provider, tier, enabled) 
VALUES 
    ('auto',    0, 0, 'openai', 'balanced', true),
    ('eco',     0, 0, 'openai', 'eco',      true),
    ('premium', 0, 0, 'openai', 'premium',  true)
ON CONFLICT (model_name) DO UPDATE SET 
    provider = EXCLUDED.provider,
    tier = EXCLUDED.tier,
    enabled = EXCLUDED.enabled;

-- 真实模型
INSERT INTO model_pricing (model_name, input_price, output_price, provider, provider_url, tier, capability)
VALUES (
    'gpt-4o', 2.5, 10.0, 'openai', 'https://api.openai.com/v1', 'premium', 
    '{"supports_json": true, "supports_tools": true, "supports_vision": true, "max_context": 128000}'
) ON CONFLICT (model_name) DO UPDATE SET 
    provider = EXCLUDED.provider, 
    provider_url = EXCLUDED.provider_url, 
    tier = EXCLUDED.tier, 
    capability = EXCLUDED.capability,
    enabled = true;

INSERT INTO model_pricing (model_name, input_price, output_price, provider, provider_url, tier, capability)
VALUES (
    'gpt-4o-mini', 0.15, 0.6, 'openai', 'https://api.openai.com/v1', 'eco', 
    '{"supports_json": true, "supports_tools": true, "supports_vision": true, "max_context": 128000}'
) ON CONFLICT (model_name) DO UPDATE SET 
    tier = EXCLUDED.tier,
    enabled = true;

INSERT INTO model_pricing (model_name, input_price, output_price, provider, provider_url, tier, capability)
VALUES (
    'claude-3-5-sonnet-20240620', 3.0, 15.0, 'anthropic', 'https://api.anthropic.com', 'premium', 
    '{"supports_json": true, "supports_tools": true, "supports_vision": true, "max_context": 200000}'
) ON CONFLICT (model_name) DO UPDATE SET 
    tier = EXCLUDED.tier,
    enabled = true;

COMMIT;
