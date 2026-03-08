-- =====================================================
-- model_pricing 仅增加 id 列，主键仍为 model_name
-- =====================================================

ALTER TABLE model_pricing
  ADD COLUMN IF NOT EXISTS id SERIAL UNIQUE;

COMMENT ON COLUMN model_pricing.id IS '自增 id（便于引用，主键仍为 model_name）';
