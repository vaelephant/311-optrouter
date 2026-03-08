-- =====================================================
-- 供应商初始数据（与 gateway config/models.toml 对应）
-- 可重复执行：存在则忽略
-- =====================================================

INSERT INTO providers (code, name, base_url)
VALUES
    ('openai',     'OpenAI',      'https://api.openai.com/v1'),
    ('anthropic',  'Anthropic',    'https://api.anthropic.com'),
    ('google',     'Google',      'https://generativelanguage.googleapis.com/v1beta'),
    ('together',   'Together AI', 'https://api.together.xyz/v1'),
    ('ollama',     'Ollama',      'http://localhost:11434/v1')
ON CONFLICT (code) DO NOTHING;

-- 将 model_pricing 中已有记录的 provider 字符串关联到 providers.id
UPDATE model_pricing mp
SET provider_id = p.id
FROM providers p
WHERE p.code = mp.provider
  AND mp.provider_id IS NULL;
