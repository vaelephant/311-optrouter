//! GET /health/models — 各模型对应上游是否可访问及响应时间
//!
//! 按 Provider 探测上游 GET /models（或等价端点），将结果按模型展开返回，
//! 供管理端「模型状态」页使用。

use axum::{extract::State, response::IntoResponse, Json};
use serde::Serialize;

use crate::router::RouterState;
use crate::startup::healthcheck::{probe_all_providers_for_api, CheckStatus};

#[derive(Serialize)]
pub struct ModelHealthItem {
    pub model:      String,
    pub provider:   String,
    /// "ok" | "no_key" | "auth_failed" | "unreachable"
    pub status:     String,
    pub latency_ms: u64,
}

#[derive(Serialize)]
pub struct HealthModelsResponse {
    pub models: Vec<ModelHealthItem>,
}

fn status_to_string(s: &CheckStatus) -> String {
    match s {
        CheckStatus::Ok => "ok",
        CheckStatus::NoKey => "no_key",
        CheckStatus::AuthFailed(_) => "auth_failed",
        CheckStatus::Unreachable(_) => "unreachable",
    }
    .to_string()
}

pub async fn health_models(State(state): State<RouterState>) -> impl IntoResponse {
    let models_by_provider = state.model_router.models_by_provider().await;
    let probe_results = probe_all_providers_for_api(state.config.clone()).await;

    let provider_map: std::collections::HashMap<String, (String, u64)> = probe_results
        .into_iter()
        .map(|r| (r.provider, (status_to_string(&r.status), r.latency_ms)))
        .collect();

    let mut models = Vec::new();
    for (provider, model_ids) in models_by_provider {
        let (status, latency_ms) = provider_map
            .get(&provider)
            .cloned()
            .unwrap_or_else(|| ("unknown".to_string(), 0));
        for model in model_ids {
            models.push(ModelHealthItem {
                model,
                provider: provider.clone(),
                status: status.clone(),
                latency_ms,
            });
        }
    }
    models.sort_by(|a, b| a.model.cmp(&b.model));

    Json(HealthModelsResponse { models })
}
