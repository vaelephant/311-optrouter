//! Google Gemini Provider
//!
//! 主要差异：Key 在 URL 参数、消息格式用 parts 数组、role 用 "model"、
//! usage 字段用 usageMetadata。

use async_trait::async_trait;
use serde_json::{json, Value};

use crate::{
    error::{AppError, AppResult},
    protocol::{ChatChoice, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, MessageRole, Usage},
};
use super::Provider;

pub struct GoogleProvider {
    api_key: String,
}

impl GoogleProvider {
    pub fn new(api_key: &str) -> Self {
        Self { api_key: api_key.to_string() }
    }
}

#[async_trait]
impl Provider for GoogleProvider {
    async fn call(
        &self,
        client:  &reqwest::Client,
        request: &ChatCompletionRequest,
        stream:  bool,
    ) -> AppResult<reqwest::Response> {
        let endpoint = if stream { "streamGenerateContent?alt=sse" } else { "generateContent" };
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:{}?key={}",
            request.model, endpoint, self.api_key
        );

        let system = request.messages.iter()
            .find(|m| m.role == MessageRole::System)
            .map(|m| json!({ "parts": [{ "text": m.content }] }));

        let contents: Vec<Value> = request.messages.iter()
            .filter(|m| m.role != MessageRole::System)
            .map(|m| {
                let role = if m.role == MessageRole::Assistant { "model" } else { "user" };
                json!({ "role": role, "parts": [{ "text": m.content }] })
            })
            .collect();

        let mut body = json!({ "contents": contents });
        if let Some(sys) = system { body["systemInstruction"] = sys; }

        let mut gen = json!({});
        if let Some(t)   = request.temperature { gen["temperature"]     = json!(t); }
        if let Some(max) = request.max_tokens  { gen["maxOutputTokens"] = json!(max); }
        if let Some(s)   = &request.stop       { gen["stopSequences"]   = json!(s); }
        if gen.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
            body["generationConfig"] = gen;
        }

        client.post(&url)
            .header("Content-Type", "application/json")
            .json(&body).send().await
            .map_err(AppError::HttpRequest)
    }

    fn convert_response(&self, model: &str, body: &Value) -> ChatCompletionResponse {
        let content = body
            .get("candidates").and_then(|c| c.as_array()).and_then(|a| a.first())
            .and_then(|c| c.get("content")).and_then(|c| c.get("parts"))
            .and_then(|p| p.as_array()).and_then(|a| a.first())
            .and_then(|p| p.get("text")).and_then(|t| t.as_str())
            .unwrap_or("").to_string();

        let usage = body.get("usageMetadata").map(|u| Usage {
            prompt_tokens:     u.get("promptTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            completion_tokens: u.get("candidatesTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
            total_tokens:      u.get("totalTokenCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
        });

        ChatCompletionResponse {
            id:      format!("chatcmpl-{}", uuid::Uuid::new_v4()),
            object:  "chat.completion".into(),
            created: chrono::Utc::now().timestamp() as u64,
            model:   model.into(),
            choices: vec![ChatChoice {
                index: 0,
                message: ChatMessage { role: MessageRole::Assistant, content, name: None, ..Default::default() },
                finish_reason: "stop".into(),
            }],
            usage,
            model_latency_ms: None, cost_yuan: None,
        }
    }
}
