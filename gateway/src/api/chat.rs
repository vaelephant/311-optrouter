//! `/v1/chat/completions` HTTP 处理器（纯 HTTP 层）
//!
//! 职责：解包 HTTP 请求 → 调用 `application::chat_service::handle_chat` → 返回响应。
//! 所有业务逻辑（鉴权、限流、余额、路由、扣费）均在 application 层实现。

use axum::{body::Body, extract::State, http::HeaderMap, http::StatusCode, response::Response, Json};

use crate::{
    application::chat_service::handle_chat,
    error::AppResult,
    protocol::ChatCompletionRequest,
    router::RouterState,
};

pub async fn chat_completions(
    State(state): State<RouterState>,
    headers: HeaderMap,
    Json(request): Json<ChatCompletionRequest>,
) -> AppResult<Response> {
    handle_chat(state, headers, request).await
}

/// 调试接口：返回固定 OpenAI 格式 JSON，用于验证客户端能否正常解析响应。
/// 验证完成后可删除此接口和 main.rs 里对应的路由注册。
pub async fn debug_echo() -> Response {
    let body = r#"{"id":"debug-echo","object":"chat.completion","created":0,"model":"gpt-4o","choices":[{"index":0,"message":{"role":"assistant","content":"echo ok"},"finish_reason":"stop"}],"usage":{"prompt_tokens":0,"completion_tokens":0,"total_tokens":0}}"#;
    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .body(Body::from(body))
        .unwrap()
}
