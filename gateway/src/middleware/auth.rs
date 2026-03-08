//! 认证工具函数
//!
//! 提供两个核心工具：
//! - [`extract_bearer`]：从 HTTP 请求头中提取 API Key 字符串
//! - [`sha256_hex`]：对 API Key 做 SHA-256 哈希，用于 DB / Redis 查询
//!
//! # 设计原则
//!
//! **数据库不存明文 Key，只存 SHA-256 哈希。**
//!
//! 优势：即使数据库泄露，攻击者也无法直接使用 hash 调用 API
//! （单向哈希，无法逆推原始 Key）。
//!
//! 流程：
//! ```text
//! 用户请求头：Authorization: Bearer sk-or-abc123
//!     ↓
//! extract_bearer() → "sk-or-abc123"
//!     ↓
//! sha256_hex()     → "e3b0c44298fc1c149afb..."
//!     ↓
//! Redis.get("ak:e3b0c44...")  ← 缓存命中：直接放行
//! 或 DB.query("WHERE key_hash = $1") ← 缓存未命中：回源
//! ```

use sha2::{Digest, Sha256};

/// 从请求头中提取 Bearer Token 或 x-api-key 的值。
///
/// 支持两种格式：
/// - `Authorization: Bearer sk-or-xxx`（标准 OAuth2 Bearer 格式）
/// - `x-api-key: sk-or-xxx`（兼容部分客户端）
///
/// # 返回
/// - `Some(key)` — 提取成功
/// - `None`      — 头不存在或值为空
pub fn extract_bearer(headers: &axum::http::HeaderMap) -> Option<String> {
    // 优先读 Authorization 头
    headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| {
            // 去掉 "Bearer " 前缀（大小写不敏感）
            let key = if s.to_lowercase().starts_with("bearer ") {
                s[7..].trim()
            } else {
                s.trim()
            };
            if key.is_empty() { None } else { Some(key.to_string()) }
        })
        // 降级：读 x-api-key 头
        .or_else(|| {
            headers
                .get("x-api-key")
                .and_then(|v| v.to_str().ok())
                .filter(|s| !s.is_empty())
                .map(String::from)
        })
}

/// 对任意字符串做 SHA-256，返回小写十六进制字符串（64 字节）。
///
/// # 用途
/// - 将用户的明文 API Key 转换为可安全存储的哈希值
/// - Redis key：`ak:<sha256_hex(api_key)>`
/// - DB 查询：`WHERE key_hash = $1`
///
/// # 示例
/// ```
/// let hash = sha256_hex("sk-or-abc123");
/// // hash = "e3b0c44298fc1c149afb4c8996fb92427ae41e4649b934ca495991b7852b855" (示例，实际值不同)
/// ```
pub fn sha256_hex(s: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    hex::encode(hasher.finalize())
}
