//! AI Provider 抽象层
//!
//! 每个模型供应商一个独立文件（如 `openai.rs`、`together.rs`、`ollama.rs`），
//! 实现 [`Provider`] trait，handler 只依赖该 trait，便于查找与维护。
//!
//! # 添加新供应商
//!
//! 1. 新建 `providers/xxx.rs`，实现 `Provider`（可复用 `OpenAIProvider` 逻辑的用包装即可）
//! 2. 本文件 `pub mod xxx`，并在 `build_provider()` 增加对应分支
//! 3. `router/model_router.rs` 增加 `ProviderType`，`config` 与 `registry` 登记模型

use async_trait::async_trait;
use serde_json::Value;

use crate::{
    error::AppResult,
    protocol::{ChatCompletionRequest, ChatCompletionResponse},
    router::ProviderType,
};

pub mod anthropic;
pub mod google;
pub mod ollama;
pub mod openai;
pub mod together;

// ─── Provider Trait ───────────────────────────────────────────────────────────

/// 所有 AI Provider 必须实现的接口
#[async_trait]
pub trait Provider: Send + Sync {
    /// 调用 Provider，返回原始 HTTP 响应。
    /// `stream = true` → 响应体为 SSE 流；`false` → 完整 JSON
    async fn call(
        &self,
        client:  &reqwest::Client,
        request: &ChatCompletionRequest,
        stream:  bool,
    ) -> AppResult<reqwest::Response>;

    /// 将 Provider 原生响应 JSON 转换为 OpenAI 兼容格式（仅非流式使用）
    fn convert_response(&self, model: &str, body: &Value) -> ChatCompletionResponse;
}

// ─── Provider 工厂 ────────────────────────────────────────────────────────────

/// 根据 ProviderType 和 API Key 构造 Provider 实例
pub fn build_provider(
    provider_type: &ProviderType,
    api_key:       &str,
    provider_url:  &str,
) -> Box<dyn Provider> {
    match provider_type {
        ProviderType::Anthropic => {
            Box::new(anthropic::AnthropicProvider::new(api_key))
        }
        ProviderType::Google => {
            Box::new(google::GoogleProvider::new(api_key))
        }
        ProviderType::Together => {
            Box::new(together::TogetherProvider::new(api_key, provider_url))
        }
        ProviderType::Ollama => {
            Box::new(ollama::OllamaProvider::new(api_key, provider_url))
        }
        ProviderType::OpenAI | ProviderType::Unknown => {
            Box::new(openai::OpenAIProvider::new(api_key, provider_url))
        }
    }
}
