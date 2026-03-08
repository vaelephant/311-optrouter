use axum::{response::IntoResponse, Json};

/// Standard rate-limit error response body
#[allow(dead_code)]
pub async fn rate_limit_error() -> impl IntoResponse {
    (
        axum::http::StatusCode::TOO_MANY_REQUESTS,
        Json(serde_json::json!({
            "error": {
                "message": "Rate limit exceeded. Please retry after a moment.",
                "type": "rate_limit_error"
            }
        })),
    )
}
