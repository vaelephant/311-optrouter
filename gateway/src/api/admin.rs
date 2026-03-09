//! 管理接口：处理配置重载与内部维护
use axum::{extract::State, Json, response::IntoResponse, http::StatusCode};
use serde_json::json;
use crate::router::RouterState;

/// 重新从数据库加载模型路由配置到内存
pub async fn reload_config(
    State(state): State<RouterState>,
) -> impl IntoResponse {
    match state.init_model_router().await {
        Ok(_) => {
            tracing::info!("Model routing configuration reloaded from database successfully.");
            (StatusCode::OK, Json(json!({
                "status": "success",
                "message": "Configuration reloaded successfully"
            })))
        },
        Err(e) => {
            tracing::error!("Failed to reload configuration from database: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({
                "status": "error",
                "message": format!("Failed to reload: {}", e)
            })))
        }
    }
}
