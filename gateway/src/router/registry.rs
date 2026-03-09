//! 模型注册表（数据库驱动）
//!
//! 负责从 Postgres 的 `model_pricing` 表加载模型元数据并转换为内存路由表。

use std::collections::HashMap;
use sqlx::PgPool;
use super::model_router::{ProviderType, RouteInfo};
use super::types::{ModelTier, ModelCapability};

/// 从数据库加载模型注册表
pub async fn load_registry_from_db(pool: &PgPool) -> Result<HashMap<String, RouteInfo>, String> {
    #[derive(sqlx::FromRow)]
    struct ModelRow {
        model_name: String,
        provider: String,
        provider_url: Option<String>,
        tier: Option<String>,
        capability: Option<serde_json::Value>,
        input_price: bigdecimal::BigDecimal,
        output_price: bigdecimal::BigDecimal,
        fallback_model: Option<String>,
        fallback_provider: Option<String>,
        fallback_provider_url: Option<String>,
    }

    let rows: Vec<ModelRow> = sqlx::query_as(
        "SELECT model_name, provider, provider_url, tier, capability, \
                input_price, output_price, \
                fallback_model, fallback_provider, fallback_provider_url \
         FROM model_pricing \
         WHERE enabled = true"
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("failed to fetch model registry from db: {}", e))?;

    let mut map = HashMap::new();
    for row in rows {
        let provider = parse_provider(&row.provider)
            .ok_or_else(|| format!("unknown provider '{}' for model '{}'", row.provider, row.model_name))?;

        let tier = row.tier.as_deref().unwrap_or("balanced");
        let tier_enum = match tier.to_lowercase().as_str() {
            "eco" => ModelTier::Eco,
            "balanced" => ModelTier::Balanced,
            "premium" => ModelTier::Premium,
            "code" => ModelTier::Code,
            "reasoning" => ModelTier::Reasoning,
            "longctx" => ModelTier::LongCtx,
            _ => ModelTier::Balanced,
        };

        let capability: ModelCapability = if let Some(cap_val) = row.capability {
            serde_json::from_value(cap_val).unwrap_or_default()
        } else {
            ModelCapability::default()
        };

        let fallback_provider = row.fallback_provider.as_ref().and_then(|s| parse_provider(s));

        let route = RouteInfo {
            model: row.model_name.clone(),
            provider_url: row.provider_url.unwrap_or_default(),
            provider,
            tier: tier_enum,
            capability,
            input_price_per_1k: row.input_price.to_string().parse().unwrap_or(0.0),
            output_price_per_1k: row.output_price.to_string().parse().unwrap_or(0.0),
            fallback_model: row.fallback_model,
            fallback_provider_url: row.fallback_provider_url,
            fallback_provider,
        };
        map.insert(row.model_name, route);
    }

    Ok(map)
}

fn parse_provider(s: &str) -> Option<ProviderType> {
    match s.trim().to_lowercase().as_str() {
        "openai"    => Some(ProviderType::OpenAI),
        "anthropic"  => Some(ProviderType::Anthropic),
        "google"    => Some(ProviderType::Google),
        "together"  => Some(ProviderType::Together),
        "ollama"    => Some(ProviderType::Ollama),
        _           => None,
    }
}
