//! Anthropic Claude Provider
//!
//! 主要差异：system 提取为顶层字段，max_tokens 必填，usage 字段名不同。

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    protocol::{ChatChoice, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, MessageRole, Usage},
};
use super::Provider;

pub struct AnthropicProvider {
    api_key: String,
}

impl AnthropicProvider {
    pub fn new(api_key: &str) -> Self {
        Self { api_key: api_key.to_string() }
    }
}

#[async_trait]
impl Provider for AnthropicProvider {
    async fn call(
        &self,
        client:  &reqwest::Client,
        request: &ChatCompletionRequest,
        stream:  bool,
    ) -> AppResult<reqwest::Response> {
        let (system, messages) = extract_system(&request.messages);

        let mut body = json!({
            "model":      request.model,
            "messages":   messages,
            "max_tokens": request.max_tokens.unwrap_or(1024),
            "stream":     stream,
        });

        if let Some(sys) = system          { body["system"]          = json!(sys); }
        if let Some(t) = request.temperature { body["temperature"]  = json!(t); }
        if let Some(p) = request.top_p      { body["top_p"]         = json!(p); }
        if let Some(s) = &request.stop      { body["stop_sequences"] = json!(s); }

        client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(AppError::HttpRequest)
    }

    fn convert_response(&self, model: &str, body: &Value) -> ChatCompletionResponse {
        let content = body
            .get("content").and_then(|c| c.as_array()).and_then(|a| a.first())
            .and_then(|c| c.get("text")).and_then(|t| t.as_str())
            .unwrap_or("").to_string();

        let finish_reason = body
            .get("stop_reason").and_then(|r| r.as_str())
            .map(|r| if r == "end_turn" { "stop" } else { r })
            .unwrap_or("stop").to_string();

        let usage = body.get("usage").map(|u| {
            let i = u.get("input_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            let o = u.get("output_tokens").and_then(|v| v.as_u64()).unwrap_or(0) as u32;
            Usage { prompt_tokens: i, completion_tokens: o, total_tokens: i + o }
        });

        let id = body.get("id").and_then(|v| v.as_str())
            .map(|s| format!("chatcmpl-{s}"))
            .unwrap_or_else(|| format!("chatcmpl-{}", uuid::Uuid::new_v4()));

        ChatCompletionResponse {
            id, object: "chat.completion".into(),
            created: chrono::Utc::now().timestamp() as u64,
            model: model.into(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage { role: MessageRole::Assistant, content, name: None, ..Default::default() },
                finish_reason,
            }],
            usage,
            model_latency_ms: None, cost_yuan: None,
        }
    }
}

fn extract_system(messages: &[ChatMessage]) -> (Option<String>, Vec<Value>) {
    let system = messages.iter()
        .find(|m| m.role == MessageRole::System)
        .map(|m| m.content.clone());
    let rest = messages.iter()
        .filter(|m| m.role != MessageRole::System)
        .map(|m| {
            let role = if m.role == MessageRole::Assistant { "assistant" } else { "user" };
            json!({ "role": role, "content": m.content })
        })
        .collect();
    (system, rest)
}
