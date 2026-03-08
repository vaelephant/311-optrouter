//! 模型路由决策
//!
//! [`ModelRouter`] 接受一个模型 ID，返回应该路由到哪个 Provider、
//! 用哪个 URL、以及 fallback 配置。
//!
//! # 路由决策逻辑
//!
//! ```text
//! request.model = "gpt-4o"
//!       ↓
//! ModelRouter::route("gpt-4o")
//!       ↓
//! RouteInfo { provider: OpenAI, provider_url: "https://api.openai.com/v1", ... }
//! ```
//!
//! # Fallback
//!
//! 主 Provider 失败时，handler 检查 `RouteInfo.fallback_*` 字段，
//! 如果配置了 fallback，则用 fallback 信息重新构造请求。
//!
//! fallback 通常由 `registry::build_default_registry()` 在启动时设置，
//! 也可通过 `set_fallback()` 运行时动态更新（如从数据库读取策略）。

use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

// ─── Provider 类型 ────────────────────────────────────────────────────────────

/// AI Provider 类型枚举。
///
/// 决定了上游 API 的 URL 格式、认证方式、请求体格式、响应解析逻辑。
#[derive(Debug, Clone, PartialEq)]
pub enum ProviderType {
    /// OpenAI 及兼容接口（Together AI、Groq、Anyscale 等）
    OpenAI,
    /// Anthropic Claude
    Anthropic,
    /// Google Gemini
    Google,
    /// Together AI（OpenAI 兼容）
    Together,
    /// Ollama 本地/自托管（OpenAI 兼容，通常无需 API Key）
    Ollama,
    /// 路由表中未找到的模型（fallback 到默认 Provider）
    Unknown,
}

impl ProviderType {
    /// 用于写入 usage_logs.provider 等
    pub fn as_str(&self) -> &'static str {
        match self {
            ProviderType::OpenAI => "openai",
            ProviderType::Anthropic => "anthropic",
            ProviderType::Google => "google",
            ProviderType::Together => "together",
            ProviderType::Ollama => "ollama",
            ProviderType::Unknown => "unknown",
        }
    }
}

// ─── 路由信息 ─────────────────────────────────────────────────────────────────

/// 单个模型的完整路由信息
#[derive(Debug, Clone)]
pub struct RouteInfo {
    pub model:                 String,
    pub provider_url:          String,
    pub provider:              ProviderType,
    pub fallback_model:        Option<String>,
    pub fallback_provider_url: Option<String>,
    pub fallback_provider:     Option<ProviderType>,
}

// ─── ModelRouter ─────────────────────────────────────────────────────────────

/// 内存路由表：模型 ID → [`RouteInfo`]
///
/// 使用 `Arc<RwLock<HashMap>>` 支持运行时动态更新（如从 DB 热加载路由策略）。
#[derive(Clone)]
pub struct ModelRouter {
    routes:              Arc<RwLock<HashMap<String, RouteInfo>>>,
    default_provider_url: String,
}

impl ModelRouter {
    pub fn new(
        routes:               HashMap<String, RouteInfo>,
        default_provider_url: String,
    ) -> Self {
        Self {
            routes:               Arc::new(RwLock::new(routes)),
            default_provider_url,
        }
    }

    /// 查询模型路由。
    ///
    /// 路由表中没有的模型返回默认路由（`ProviderType::Unknown`，指向 openai_base_url），
    /// 允许兼容接口直接透传。
    pub async fn route(&self, model: &str) -> RouteInfo {
        let routes = self.routes.read().await;
        routes.get(model).cloned().unwrap_or_else(|| RouteInfo {
            model:                model.to_string(),
            provider_url:         self.default_provider_url.clone(),
            provider:             ProviderType::Unknown,
            fallback_model:       None,
            fallback_provider_url: None,
            fallback_provider:    None,
        })
    }

    /// 运行时设置 fallback（可由管理接口或定时任务动态更新）
    #[allow(dead_code)]
    pub async fn set_fallback(
        &self,
        model:            &str,
        fallback_model:   &str,
        fallback_url:     &str,
        fallback_provider: ProviderType,
    ) {
        let mut routes = self.routes.write().await;
        if let Some(route) = routes.get_mut(model) {
            route.fallback_model        = Some(fallback_model.to_string());
            route.fallback_provider_url = Some(fallback_url.to_string());
            route.fallback_provider     = Some(fallback_provider);
        }
    }

    /// 列出所有已注册的模型 ID（供启动时打印、GET /v1/models 等使用）
    pub async fn list_models(&self) -> Vec<String> {
        let mut models: Vec<String> = self.routes.read().await.keys().cloned().collect();
        models.sort();
        models
    }

    /// 按 Provider 分组，返回 `(provider_name, [model_id, ...])` 列表，已排序。
    /// 用于启动摘要显示各 Provider 提供的模型。
    pub async fn models_by_provider(&self) -> Vec<(String, Vec<String>)> {
        let routes = self.routes.read().await;
        let mut map: std::collections::BTreeMap<String, Vec<String>> = std::collections::BTreeMap::new();
        for (model_id, info) in routes.iter() {
            map.entry(info.provider.as_str().to_string())
                .or_default()
                .push(model_id.clone());
        }
        for models in map.values_mut() {
            models.sort();
        }
        map.into_iter().collect()
    }
}
