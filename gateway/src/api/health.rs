//! GET /health — 健康检查
//!
//! 检查 DB 与 Redis 可用性，任一项失败返回 503，供 K8s/负载均衡摘流。

use axum::{extract::State, response::IntoResponse, Json};
use axum::http::StatusCode;
use serde_json::json;

use crate::router::RouterState;

pub async fn health_check(
    State(state): State<RouterState>,
) -> impl IntoResponse {
    let db_ok = sqlx::query("SELECT 1")
        .execute(&state.db)
        .await
        .is_ok();
    let mut redis = state.redis.clone();
    let redis_ok = redis::cmd("PING")
        .query_async::<redis::aio::ConnectionManager, String>(&mut redis)
        .await
        .is_ok();

    if db_ok && redis_ok {
        (StatusCode::OK, Json(json!({
            "status": "healthy",
            "version": env!("CARGO_PKG_VERSION"),
            "db": "ok",
            "redis": "ok",
        })))
    } else {
        (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(json!({
                "status": "unhealthy",
                "version": env!("CARGO_PKG_VERSION"),
                "db": if db_ok { "ok" } else { "error" },
                "redis": if redis_ok { "ok" } else { "error" },
            })),
        )
    }
}
