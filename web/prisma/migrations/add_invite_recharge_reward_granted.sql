-- 邀请关系表：被邀请人首次充值时，邀请人获得余额奖励（仅发一次）
-- 此字段标记该邀请关系是否已发放过「被邀请人首充」奖励
ALTER TABLE invite_relation
ADD COLUMN IF NOT EXISTS recharge_reward_granted_at TIMESTAMP NULL;
COMMENT ON COLUMN invite_relation.recharge_reward_granted_at IS '被邀请人首充奖励已发放时间（仅发放一次）';
