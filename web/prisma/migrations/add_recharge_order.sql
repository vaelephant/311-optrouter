-- =====================================================
-- 添加充值订单相关表和枚举
-- =====================================================

-- 1. 创建充值订单状态枚举
DO $$ BEGIN
    CREATE TYPE "RechargeOrderStatus" AS ENUM ('pending', 'paid', 'failed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. 创建充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    biz_order_no VARCHAR(255) NOT NULL UNIQUE,
    gateway_order_no VARCHAR(255),
    amount NUMERIC(12,4) NOT NULL,
    pay_provider VARCHAR(20) NOT NULL,
    status "RechargeOrderStatus" NOT NULL DEFAULT 'pending',
    qrcode_url TEXT,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_at TIMESTAMP,
    CONSTRAINT fk_recharge_order_user FOREIGN KEY (user_id) REFERENCES "users"(id) ON DELETE CASCADE,
    CONSTRAINT chk_pay_provider CHECK (pay_provider IN ('WECHAT', 'ALIPAY'))
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_recharge_orders_user_created ON recharge_orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_biz_order_no ON recharge_orders(biz_order_no);
CREATE INDEX IF NOT EXISTS idx_recharge_orders_gateway_order_no ON recharge_orders(gateway_order_no);

-- 4. 添加表注释
COMMENT ON TABLE recharge_orders IS '充值订单表 - 记录用户充值订单信息';
COMMENT ON COLUMN recharge_orders.biz_order_no IS '业务订单号（系统内部唯一）';
COMMENT ON COLUMN recharge_orders.gateway_order_no IS '网关订单号（支付网关返回）';
COMMENT ON COLUMN recharge_orders.amount IS '充值金额（元）';
COMMENT ON COLUMN recharge_orders.pay_provider IS '支付渠道（WECHAT/ALIPAY）';
COMMENT ON COLUMN recharge_orders.status IS '订单状态';
COMMENT ON COLUMN recharge_orders.qrcode_url IS '支付二维码URL（NATIVE方式）';
COMMENT ON COLUMN recharge_orders.processed IS '是否已处理（幂等控制）';
