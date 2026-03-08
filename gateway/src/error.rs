//! 统一错误类型
//!
//! 所有 handler 返回 `AppResult<T>`，错误会被自动转换为符合 OpenAI 格式的 JSON 响应：
//! ```json
//! { "error": { "message": "...", "type": "..." } }
//! ```

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

// ─── 错误枚举 ─────────────────────────────────────────────────────────────────

#[derive(Debug)]
pub enum AppError {
    /// 401 - 缺少或无效的 API Key
    Authentication(String),
    /// 403 - Key 存在但无权限（已禁用/过期）
    Authorization(String),
    /// 400 - 请求参数有误
    BadRequest(String),
    /// 404 - 资源不存在（路由、模型未找到等）
    #[allow(dead_code)]
    NotFound(String),
    /// 402 - 余额不足，无法完成扣费
    InsufficientBalance(String),
    /// 429 - 触发限流（网关保护层）
    #[allow(dead_code)]
    RateLimited(String),
    /// 502 - 上游 AI Provider 返回错误
    Upstream(String),
    /// 500 - 网关内部错误（DB / Redis / 逻辑错误）
    Internal(String),
    /// 400 - JSON 解析失败
    JsonParse(serde_json::Error),
    /// 502 - HTTP 请求失败（reqwest）
    HttpRequest(reqwest::Error),
}

// ─── 辅助方法 ─────────────────────────────────────────────────────────────────

impl AppError {
    /// 映射到 HTTP 状态码
    pub fn status_code(&self) -> StatusCode {
        match self {
            Self::Authentication(_)    => StatusCode::UNAUTHORIZED,
            Self::Authorization(_)     => StatusCode::FORBIDDEN,
            Self::BadRequest(_)        => StatusCode::BAD_REQUEST,
            Self::NotFound(_)          => StatusCode::NOT_FOUND,
            Self::InsufficientBalance(_) => StatusCode::PAYMENT_REQUIRED,
            Self::RateLimited(_)       => StatusCode::TOO_MANY_REQUESTS,
            Self::Upstream(_)          => StatusCode::BAD_GATEWAY,
            Self::Internal(_)          => StatusCode::INTERNAL_SERVER_ERROR,
            Self::JsonParse(_)         => StatusCode::BAD_REQUEST,
            Self::HttpRequest(_)       => StatusCode::BAD_GATEWAY,
        }
    }

    /// OpenAI 兼容的 error.type 字段
    pub fn error_type(&self) -> &'static str {
        match self {
            Self::Authentication(_)    => "authentication_error",
            Self::Authorization(_)     => "authorization_error",
            Self::BadRequest(_)        => "invalid_request_error",
            Self::NotFound(_)          => "not_found_error",
            Self::InsufficientBalance(_) => "insufficient_balance",
            Self::RateLimited(_)       => "rate_limit_error",
            Self::Upstream(_)          => "upstream_error",
            Self::Internal(_)          => "internal_error",
            Self::JsonParse(_)         => "json_parse_error",
            Self::HttpRequest(_)       => "http_request_error",
        }
    }

    /// 错误消息正文
    pub fn message(&self) -> String {
        match self {
            Self::Authentication(m)
            | Self::Authorization(m)
            | Self::BadRequest(m)
            | Self::NotFound(m)
            | Self::InsufficientBalance(m)
            | Self::RateLimited(m)
            | Self::Upstream(m)
            | Self::Internal(m) => m.clone(),
            Self::JsonParse(e)  => e.to_string(),
            Self::HttpRequest(e) => e.to_string(),
        }
    }
}

// ─── 标准 trait 实现 ──────────────────────────────────────────────────────────

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}: {}", self.error_type(), self.message())
    }
}

impl std::error::Error for AppError {}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self { Self::JsonParse(e) }
}

impl From<reqwest::Error> for AppError {
    fn from(e: reqwest::Error) -> Self { Self::HttpRequest(e) }
}

/// 将 sqlx 数据库错误包装为内部错误
impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        Self::Internal(format!("database error: {e}"))
    }
}

/// 将 redis 错误包装为内部错误
impl From<redis::RedisError> for AppError {
    fn from(e: redis::RedisError) -> Self {
        Self::Internal(format!("cache error: {e}"))
    }
}

// ─── Axum 响应转换 ────────────────────────────────────────────────────────────

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status     = self.status_code();
        let error_type = self.error_type();
        let message    = self.message();

        (
            status,
            Json(json!({
                "error": {
                    "message": message,
                    "type":    error_type,
                }
            })),
        )
            .into_response()
    }
}

/// 所有 handler 的统一返回类型
pub type AppResult<T> = Result<T, AppError>;
