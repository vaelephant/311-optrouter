//! 模型路由决策
//!
//! [`ModelRouter`] 接受一个模型 ID，返回应该路由到哪个 Provider、
//! 用哪个 URL、以及 fallback 配置。

use std::{collections::HashMap, sync::Arc};
use tokio::sync::RwLock;

use super::types::{ModelTier, ModelCapability, RequestProfile, RoutingDecision, SessionSummary};
use super::strategy::{CoarseRouter, ContextualRouter, RefinedRouter};

// ─── Provider 类型 ────────────────────────────────────────────────────────────

/// AI Provider 类型枚举。
#[derive(Debug, Clone, PartialEq)]
pub enum ProviderType {
    OpenAI,
    Anthropic,
    Google,
    Together,
    Ollama,
    Unknown,
}

impl ProviderType {
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
    pub tier:                  ModelTier,
    pub capability:            ModelCapability,
    pub input_price_per_1k:    f64,
    pub output_price_per_1k:   f64,
    pub fallback_model:        Option<String>,
    pub fallback_provider_url: Option<String>,
    pub fallback_provider:     Option<ProviderType>,
}

// ─── ModelRouter ─────────────────────────────────────────────────────────────

/// 智能路由结果
pub enum IntelligentRouteResult {
    /// 已决定路由
    Routed(RouteInfo, RoutingDecision),
    /// 需要 Layer 3 小模型复判
    NeedsRefinement(String, String), // (分类模型名, 分类 Prompt)
    /// 走传统静态路由
    Static(RouteInfo),
}

/// 内存路由表：模型 ID → [`RouteInfo`]
#[derive(Clone)]
pub struct ModelRouter {
    routes:              Arc<RwLock<HashMap<String, RouteInfo>>>,
    default_provider_url: String,
    coarse_router:       Arc<CoarseRouter>,
    contextual_router:   Arc<ContextualRouter>,
    refined_router:     Arc<RefinedRouter>,
    pub summary_model:  String,
}

impl ModelRouter {
    pub fn new(
        routes:               HashMap<String, RouteInfo>,
        default_provider_url: String,
    ) -> Self {
        Self {
            routes:               Arc::new(RwLock::new(routes)),
            default_provider_url,
            coarse_router:       Arc::new(CoarseRouter::default()),
            contextual_router:   Arc::new(ContextualRouter::default()),
            refined_router:     Arc::new(RefinedRouter::default()),
            summary_model:      "gpt-4o-mini".to_string(),
        }
    }

    /// 全量更新路由表
    pub async fn update_routes(&self, new_routes: HashMap<String, RouteInfo>) {
        let mut routes = self.routes.write().await;
        *routes = new_routes;
    }

    /// 智能路由主入口
    pub async fn intelligent_route(
        &self, 
        profile: &RequestProfile, 
        summary: Option<&SessionSummary>,
        raw_message: &str,
        force_routing: bool,
    ) -> IntelligentRouteResult {
        // 1. 尝试 Layer 1 粗路由
        if let Some(decision) = self.coarse_router.route(profile) {
             if force_routing || decision.confidence > 0.9 {
                 if let Some(route) = self.find_best_model_for_tier(decision.tier).await {
                     return IntelligentRouteResult::Routed(route, decision);
                 }
             }
        }

        // 2. 尝试 Layer 2 上下文路由
        if let Some(summary) = summary {
            if let Some(decision) = self.contextual_router.route(profile, summary) {
                if force_routing || decision.confidence > 0.75 {
                    if let Some(route) = self.find_best_model_for_tier(decision.tier).await {
                        return IntelligentRouteResult::Routed(route, decision);
                    }
                }
            }
        }

        // 3. 如果强制路由但前两层都模糊，则触发 Layer 3
        if force_routing {
            let prompt = self.refined_router.build_prompt(raw_message, summary);
            return IntelligentRouteResult::NeedsRefinement(self.refined_router.model.clone(), prompt);
        }

        // 4. 不满足路由触发条件
        IntelligentRouteResult::Static(RouteInfo {
            model: "unknown".to_string(),
            provider_url: "".to_string(),
            provider: ProviderType::Unknown,
            tier: ModelTier::Balanced,
            capability: Default::default(),
            input_price_per_1k: 0.0,
            output_price_per_1k: 0.0,
            fallback_model: None,
            fallback_provider_url: None,
            fallback_provider: None,
        })
    }

    /// 查询模型路由（静态）
    pub async fn route(&self, model: &str) -> RouteInfo {
        let routes = self.routes.read().await;
        routes.get(model).cloned().unwrap_or_else(|| RouteInfo {
            model:                model.to_string(),
            provider_url:         self.default_provider_url.clone(),
            provider:             ProviderType::Unknown,
            tier:                 ModelTier::Balanced,
            capability:           ModelCapability::default(),
            input_price_per_1k:   0.0,
            output_price_per_1k:  0.0,
            fallback_model:       None,
            fallback_provider_url: None,
            fallback_provider:    None,
        })
    }

    /// 根据解析出的 Tier 选定路由
    pub async fn route_by_tier(&self, tier: ModelTier) -> Option<RouteInfo> {
        self.find_best_model_for_tier(tier).await
    }

    /// 解析 Layer 3 返回的文本
    pub fn parse_refined_tier(&self, response: &str) -> ModelTier {
        self.refined_router.parse_tier(response)
    }

    /// 构造摘要更新的 Prompt
    pub fn build_summary_prompt(&self, messages_json: &str) -> String {
        self.refined_router.build_summary_prompt(messages_json)
    }

    /// 解析摘要返回的 JSON
    pub fn parse_summary_response(&self, response: &str, session_id: uuid::Uuid) -> Option<SessionSummary> {
        let json_str = response.trim()
            .strip_prefix("```json").unwrap_or(response)
            .strip_suffix("```").unwrap_or(response)
            .trim();
            
        if let Ok(mut summary) = serde_json::from_str::<SessionSummary>(json_str) {
            summary.session_id = session_id;
            return Some(summary);
        }
        None
    }

    /// 为指定档位寻找最佳模型
    async fn find_best_model_for_tier(&self, tier: ModelTier) -> Option<RouteInfo> {
        let routes = self.routes.read().await;
        routes.values()
            .filter(|r| r.tier == tier)
            .min_by(|a, b| {
                a.input_price_per_1k.partial_cmp(&b.input_price_per_1k).unwrap_or(std::cmp::Ordering::Equal)
            })
            .cloned()
    }

    /// 运行时设置 fallback
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

    pub async fn list_models(&self) -> Vec<String> {
        let mut models: Vec<String> = self.routes.read().await.keys().cloned().collect();
        models.sort();
        models
    }

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
