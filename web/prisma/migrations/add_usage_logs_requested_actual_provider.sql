-- 企业级计费：usage_logs 增加 requested_model, provider, request_id
-- 与 12-计费设计说明 配套，部署前执行一次即可

ALTER TABLE usage_logs
  ADD COLUMN IF NOT EXISTS requested_model TEXT,
  ADD COLUMN IF NOT EXISTS provider       TEXT,
  ADD COLUMN IF NOT EXISTS request_id     TEXT;

COMMENT ON COLUMN usage_logs.requested_model IS '用户请求的模型，与 model 不同时表示发生了 fallback';
COMMENT ON COLUMN usage_logs.provider IS '实际调用的提供商：openai / anthropic / google';
COMMENT ON COLUMN usage_logs.request_id IS '请求追踪 ID，便于对账与排查';
