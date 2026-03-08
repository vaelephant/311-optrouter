-- =====================================================
-- 供应商表 + model_pricing 成本与供应商相关字段
-- =====================================================

-- 1. 创建供应商表
CREATE TABLE IF NOT EXISTS providers (
    id         SERIAL PRIMARY KEY,
    code       VARCHAR(32) NOT NULL UNIQUE,
    name       VARCHAR(128),
    base_url   TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_providers_code ON providers(code);

COMMENT ON TABLE providers IS 'API 供应商表 - 基本信息与默认 base URL';
COMMENT ON COLUMN providers.code IS '供应商代码（openai / anthropic / google / together / ollama）';
COMMENT ON COLUMN providers.name IS '显示名称';
COMMENT ON COLUMN providers.base_url IS '默认 base URL（模型可覆盖）';

-- 2. model_pricing 新增字段
ALTER TABLE model_pricing
    ADD COLUMN IF NOT EXISTS provider_id  INTEGER REFERENCES providers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS input_cost    NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS output_cost   NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS base_url     TEXT,
    ADD COLUMN IF NOT EXISTS max_tokens   INTEGER,
    ADD COLUMN IF NOT EXISTS description  TEXT,
    ADD COLUMN IF NOT EXISTS updated_at   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_model_pricing_provider_id ON model_pricing(provider_id);

COMMENT ON COLUMN model_pricing.provider_id IS '所属供应商（可选）';
COMMENT ON COLUMN model_pricing.input_cost IS '输入 token 成本价（每 1K tokens）';
COMMENT ON COLUMN model_pricing.output_cost IS '输出 token 成本价（每 1K tokens）';
COMMENT ON COLUMN model_pricing.base_url IS '模型 base URL 覆盖（不填则用供应商默认）';
COMMENT ON COLUMN model_pricing.max_tokens IS '模型最大 token 数';
COMMENT ON COLUMN model_pricing.description IS '模型简介';
