-- 使用 invite_reward_rule 表存储「被邀请人首充」奖励金额（不新建 invite_reward_config）
-- 约定：invite_count = 0 表示该规则；reward_type = 'balance' 时 reward_value 直接为金额（元）
-- 若之前执行过创建 invite_reward_config 的版本，可手动执行：DROP TABLE IF EXISTS invite_reward_config;

-- 允许 reward_type 为 'balance'
ALTER TABLE invite_reward_rule
DROP CONSTRAINT IF EXISTS chk_reward_type;
ALTER TABLE invite_reward_rule
ADD CONSTRAINT chk_reward_type CHECK (reward_type IN ('points', 'coupon', 'vip_days', 'balance'));

-- 插入「被邀请人首充」奖励规则：invite_count=0，reward_value 直接为金额（元），10 即 10 元
INSERT INTO invite_reward_rule (invite_count, reward_type, reward_value, reward_name, reward_description, is_active, created_at, updated_at)
VALUES (0, 'balance', 10, '被邀请人首充奖励', '被邀请人首次充值时邀请人获得的余额奖励；reward_type=balance 时 reward_value 单位为元', TRUE, NOW()::TEXT, NOW()::TEXT)
ON CONFLICT (invite_count) DO NOTHING;
