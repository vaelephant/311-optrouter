//! 数据库访问层
//!
//! # 子模块职责划分
//!
//! | 模块 | 职责 |
//! |------|------|
//! | [`types`] | 领域数据结构（ApiKeyMeta、BillArgs、ModelPricingInfo）|
//! | [`pg`] | Postgres 操作：Key 验证、定价查询、原子扣费事务 |
//! | [`redis`] | Redis 缓存：Key 元数据读写、吊销时立即删除 |
//!
//! 调用方通过 `db::xxx` 直接使用，无需关心在哪个子模块里：
//! ```rust
//! use crate::db::{validate_key_from_db, bill_in_tx, cache_get_key_meta};
//! ```

pub mod pg;
pub mod redis;
pub mod types;

// ── Postgres 操作 re-export ──────────────────────────────────────────────────
pub use pg::{bill_in_tx, get_model_pricing, get_model_pricing_with_provider, get_user_balance, list_enabled_models, validate_key_from_db};

// ── Redis 缓存 re-export ─────────────────────────────────────────────────────
pub use redis::{cache_get_key_meta, cache_set_key_meta, get_session_summary, set_session_summary};
// Next.js 吊销 Key 时调用，当前未被内部代码引用，但作为公开接口保留
#[allow(unused_imports)]
pub use redis::cache_del_key_meta;

// ── 领域类型 re-export ───────────────────────────────────────────────────────
pub use types::{ApiKeyMeta, BillArgs, ModelPricingInfo};
