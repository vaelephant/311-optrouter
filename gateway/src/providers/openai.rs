//! OpenAI Provider
//!
//! 其他 OpenAI 兼容供应商（如 Together、Groq）各在独立文件中实现或包装本逻辑。
//!
//! # 流式 usage 获取
//! 请求加 `stream_options.include_usage = true` 后，OpenAI 在 `[DONE]` 前
//! 额外推送一个带 `usage` 字段的 chunk，由 `AccountingStream` 截取。

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    protocol::{ChatChoice, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, MessageRole, Usage},
};
use super::Provider;

pub struct OpenAIProvider {
    api_key:  String,
    base_url: String,
}

impl OpenAIProvider {
    pub fn new(api_key: &str, base_url: &str) -> Self {
        Self {
            api_key:  api_key.to_string(),
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }
}

#[async_trait]
impl Provider for OpenAIProvider {
    async fn call(
        &self,
        client:  &reqwest::Client,
        request: &ChatCompletionRequest,
        stream:  bool,
    ) -> AppResult<reqwest::Response> {
        let url = format!("{}/chat/completions", self.base_url);

        let mut body = serde_json::to_value(request)?;
        body["stream"] = json!(stream);

        // 流式时追加 stream_options，让 OpenAI 在末尾附带 usage（扣费必需）
        if stream {
            body["stream_options"] = json!({ "include_usage": true });
        }

        client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(AppError::HttpRequest)
    }

    fn convert_response(&self, model: &str, body: &Value) -> ChatCompletionResponse {
        let id = body
            .get("id").and_then(|v| v.as_str()).unwrap_or("chatcmpl-unknown").to_string();
        let created = body
            .get("created").and_then(|v| v.as_u64())
            .unwrap_or_else(|| chrono::Utc::now().timestamp() as u64);

        let choices = body
            .get("choices").and_then(|v| v.as_array())
            .map(|arr| arr.iter().map(|c| ChatChoice {
                index:         c.get("index").and_then(|i| i.as_u64()).unwrap_or(0) as u32,
                message:       c.get("message").map(parse_message).unwrap_or_default(),
                finish_reason: c.get("finish_reason").and_then(|f| f.as_str()).unwrap_or("stop").into(),
            }).collect())
            .unwrap_or_default();

        ChatCompletionResponse {
            id, object: "chat.completion".into(), created,
            model: model.into(), choices, usage: body.get("usage").map(parse_usage),
            model_latency_ms: None, cost_yuan: None,
        }
    }
}

fn parse_message(v: &Value) -> ChatMessage {
    ChatMessage {
        role: match v.get("role").and_then(|r| r.as_str()) {
            Some("system") => MessageRole::System,
            Some("user")   => MessageRole::User,
            _              => MessageRole::Assistant,
        },
        content: v.get("content").and_then(|c| c.as_str()).unwrap_or("").into(),
        name:    v.get("name").and_then(|n| n.as_str()).map(String::from),
        ..Default::default()
    }
}

fn parse_usage(u: &Value) -> Usage {
    Usage {
        prompt_tokens:     u.get("prompt_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        completion_tokens: u.get("completion_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        total_tokens:      u.get("total_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
    }
}
