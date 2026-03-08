//! 认证服务：从 Redis 缓存或 Postgres 验证 API Key，返回 ApiKeyMeta。

use axum::http::HeaderMap;

use crate::{
    db::{self, ApiKeyMeta, cache_get_key_meta, cache_set_key_meta},
    error::{AppError, AppResult},
    middleware::auth::{extract_bearer, sha256_hex},
    router::RouterState,
};

/// 从请求头中提取并验证 API Key。
///
/// 优先查 Redis 缓存；未命中则回源 Postgres 并写缓存。
/// Key 非 active 状态时返回 Authorization 错误。
pub async fn authenticate(state: &RouterState, headers: &HeaderMap) -> AppResult<ApiKeyMeta> {
    let api_key  = extract_bearer(headers)
        .ok_or_else(|| AppError::Authentication("Missing API key".into()))?;
    let key_hash = sha256_hex(&api_key);

    let mut redis = state.redis.clone();
    let meta = if let Some(cached) = cache_get_key_meta(&mut redis, &key_hash).await {
        cached
    } else {
        let from_db = db::validate_key_from_db(&state.db, &key_hash).await?
            .ok_or_else(|| AppError::Authentication("Invalid API key".into()))?;
        let ttl = state.config.key_cache_ttl_secs;
        cache_set_key_meta(&mut redis, &key_hash, &from_db, ttl).await;
        from_db
    };

    if meta.status != "active" {
        return Err(AppError::Authorization(format!("API key is '{}'", meta.status)));
    }
    Ok(meta)
}
