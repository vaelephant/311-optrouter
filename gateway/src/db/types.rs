//! DB 层共用数据类型
//!
//! 这里定义的是**领域对象**（Domain Objects），是数据库实体在 Rust 侧的表示。
//! 注意与 `protocol/openai.rs` 中的 HTTP 协议结构区分：
//!
//! | 文件 | 用途 |
//! |------|------|
//! | `db/types.rs` | DB 查询结果 / 业务逻辑入参，仅内部使用 |
//! | `protocol/openai.rs` | 对外 HTTP 请求/响应，与 DB 无关 |

use bigdecimal::BigDecimal;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

// ─── API Key ──────────────────────────────────────────────────────────────────

/// API Key 元信息（从 Postgres 加载，缓存在 Redis 中）
///
/// 每次请求验证时，优先从 Redis 取这个结构体，
/// 避免每次都查 Postgres（Redis hit ≈ 0.5ms，DB query ≈ 2-5ms）。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyMeta {
    /// `api_keys` 表主键，用于写 `usage_logs.api_key_id`
    pub api_key_id: Uuid,
    /// 所属用户，用于扣费、写 `usage_logs.user_id`
    pub user_id: Uuid,
    /// `"active"` | `"disabled"` | `"expired"`
    pub status: String,
    /// 每分钟请求上限（网关保护层使用）
    pub rate_limit_per_min: i32,
}

// ─── 模型定价 ─────────────────────────────────────────────────────────────────

/// 模型定价信息（来自 `model_pricing` 表）
#[derive(Debug, Clone)]
pub struct ModelPricingInfo {
    /// 每 1K input tokens 的美元价格（BigDecimal 避免浮点误差）
    pub input_price:  BigDecimal,
    /// 每 1K output tokens 的美元价格
    pub output_price: BigDecimal,
}

// ─── 扣费入参 ─────────────────────────────────────────────────────────────────

/// 原子扣费事务的全部入参
///
/// 由 handler 在拿到 Provider 响应的 usage 数据后构造，
/// 传给 [`crate::db::pg::bill_in_tx`]。
pub struct BillArgs {
    pub user_id:       Uuid,
    pub api_key_id:    Uuid,
    /// 实际调用的模型（写入 usage_logs.model，用于计费与关联 model_pricing）
    pub model:         String,
    /// 用户请求的模型（与 model 不同时表示发生了 fallback）
    pub requested_model: Option<String>,
    /// 实际调用的提供商（如 "openai" / "anthropic" / "google"）
    pub provider:     Option<String>,
    /// 请求追踪 ID（可选）
    pub request_id:   Option<String>,
    pub input_tokens:  i32,
    pub output_tokens: i32,
    pub total_tokens:  i32,
    /// 本次调用费用（按 actual model 单价计算）
    pub cost:          BigDecimal,
    /// 端到端延迟，写入 usage_logs.latency_ms
    pub latency_ms:    i32,
}
