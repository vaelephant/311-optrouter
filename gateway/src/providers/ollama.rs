//! Ollama Provider
//!
//! 本地或自托管 Ollama，API 与 OpenAI 兼容（POST /v1/chat/completions）。
//! 通常无需 API Key，未配置 `OLLAMA_API_KEY` 时使用空字符串（Ollama 会忽略 Authorization 头）。
//! 复用 [`super::openai::OpenAIProvider`] 的逻辑。

use async_trait::async_trait;
use serde_json::Value;

use super::Provider;
use crate::{error::AppResult, protocol::ChatCompletionRequest, protocol::ChatCompletionResponse};

pub struct OllamaProvider {
    inner: super::openai::OpenAIProvider,
}

impl OllamaProvider {
    pub fn new(api_key: &str, base_url: &str) -> Self {
        Self {
            inner: super::openai::OpenAIProvider::new(api_key, base_url),
        }
    }
}

#[async_trait]
impl Provider for OllamaProvider {
    async fn call(
        &self,
        client: &reqwest::Client,
        request: &ChatCompletionRequest,
        stream: bool,
    ) -> AppResult<reqwest::Response> {
        self.inner.call(client, request, stream).await
    }

    fn convert_response(&self, model: &str, body: &Value) -> ChatCompletionResponse {
        self.inner.convert_response(model, body)
    }
}
