//! Together AI Provider
//!
//! API 与 OpenAI 兼容（POST /v1/chat/completions），复用 [`super::openai::OpenAIProvider`] 的逻辑，
//! 本文件仅做独立入口，便于按供应商维护与扩展（如后续 Together 特有参数可在此加）。

use async_trait::async_trait;
use serde_json::Value;

use super::Provider;
use crate::{error::AppResult, protocol::ChatCompletionRequest, protocol::ChatCompletionResponse};

pub struct TogetherProvider {
    inner: super::openai::OpenAIProvider,
}

impl TogetherProvider {
    pub fn new(api_key: &str, base_url: &str) -> Self {
        Self {
            inner: super::openai::OpenAIProvider::new(api_key, base_url),
        }
    }
}

#[async_trait]
impl Provider for TogetherProvider {
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
