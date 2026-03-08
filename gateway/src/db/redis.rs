//! Redis 缓存操作
//!
//! 只负责 API Key 元数据的缓存读写，不包含任何 Postgres 逻辑。
//!
//! # Key 格式
//! ```text
//! ak:<sha256_hex(raw_api_key)>
//! ```
//!
//! # 缓存生命周期
//!
//! ```text
//! 写入：validate_key_from_db 成功后，TTL = KEY_CACHE_TTL_SECS（默认 1800s）
//! 失效：
//!   a. TTL 自然过期
//!   b. Next.js 吊销 Key 时调用 cache_del_key_meta（即时失效）
//! ```
//!
//! # 错误策略
//! Redis 操作失败**静默降级**（只打 warn 日志），不向上传播错误。
//! 原因：缓存层故障不应中断核心业务逻辑，只是性能降级（多查一次 DB）。

use redis::{aio::ConnectionManager, AsyncCommands};

use super::types::ApiKeyMeta;

fn cache_key(key_hash: &str) -> String {
    format!("ak:{key_hash}")
}

/// 从 Redis 读取 Key 元数据。
///
/// 返回 `None`：缓存未命中（需要回源查 DB）或 Redis 故障（静默降级）。
pub async fn cache_get_key_meta(
    redis:    &mut ConnectionManager,
    key_hash: &str,
) -> Option<ApiKeyMeta> {
    let rkey = cache_key(key_hash);
    let raw: Option<String> = redis.get(&rkey).await.ok()?;
    serde_json::from_str(&raw?).ok()
}

/// 将 Key 元数据写入 Redis，设置过期时间。
///
/// 写入失败只打 warn，不影响请求处理。
pub async fn cache_set_key_meta(
    redis:    &mut ConnectionManager,
    key_hash: &str,
    meta:     &ApiKeyMeta,
    ttl_secs: u64,
) {
    let rkey = cache_key(key_hash);
    match serde_json::to_string(meta) {
        Ok(json) => {
            let result: redis::RedisResult<()> = redis.set_ex(&rkey, json, ttl_secs).await;
            if let Err(e) = result {
                tracing::warn!(key_hash = %key_hash, err = %e, "redis set_ex failed");
            }
        }
        Err(e) => tracing::warn!(err = %e, "failed to serialize ApiKeyMeta for cache"),
    }
}

/// 立即从 Redis 删除指定 Key 的缓存（吊销时调用）。
///
/// 由 Next.js 控制台在撤销 API Key 时触发（通过内部 API 调用此逻辑），
/// 使缓存立即失效，无需等待 TTL 自然过期。
#[allow(dead_code)]
pub async fn cache_del_key_meta(redis: &mut ConnectionManager, key_hash: &str) {
    let rkey = cache_key(key_hash);
    let result: redis::RedisResult<()> = redis.del(&rkey).await;
    if let Err(e) = result {
        tracing::warn!(key_hash = %key_hash, err = %e, "redis del failed");
    }
}
