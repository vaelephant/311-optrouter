//! 模型注册表（配置文件驱动）
//!
//! 启动时从 TOML 配置文件加载 `model → RouteInfo` 映射，**必须**提供有效配置，无内置默认模型列表。
//!
//! # 配置文件
//!
//! - 路径：环境变量 `REGISTRY_CONFIG`，或默认 `config/models.toml`（相对当前工作目录）
//! - 格式：TOML，`[[models]]` 数组，每项含 `model`、`provider`、`provider_url`，可选 `fallback_*`
//! - 修改后重启 Gateway 即可生效，无需重新编译。
//!
//! # 预留接口：policy.rs（TODO）
//!
//! 用户级别 allowlist、A/B 路由等可在 `router/policy.rs` 实现。

use std::collections::HashMap;
use std::path::Path;

use super::model_router::{ProviderType, RouteInfo};

/// 配置文件根结构
#[derive(serde::Deserialize)]
struct ModelsConfig {
    models: Vec<ModelEntry>,
}

#[derive(serde::Deserialize)]
struct ModelEntry {
    model:         String,
    provider:      String,
    provider_url:  String,
    #[serde(default)]
    fallback_model:        Option<String>,
    #[serde(default)]
    fallback_provider_url: Option<String>,
    #[serde(default)]
    fallback_provider:     Option<String>,
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

/// 从 TOML 配置文件加载模型注册表。
pub fn load_registry_from_path(path: &str) -> Result<HashMap<String, RouteInfo>, String> {
    let path = Path::new(path);
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("read registry config {}: {}", path.display(), e))?;

    let config: ModelsConfig = toml::from_str(&content)
        .map_err(|e| format!("parse registry config {}: {}", path.display(), e))?;

    let mut map = HashMap::new();
    for entry in config.models {
        let provider = parse_provider(&entry.provider)
            .ok_or_else(|| format!("unknown provider '{}' for model '{}'", entry.provider, entry.model))?;

        let fallback_provider = entry
            .fallback_provider
            .as_ref()
            .and_then(|s| parse_provider(s));

        let (fallback_model, fallback_provider_url, fallback_provider) = match (
            entry.fallback_model,
            entry.fallback_provider_url,
            fallback_provider,
        ) {
            (Some(m), Some(u), Some(p)) => (Some(m), Some(u), Some(p)),
            (None, None, None) => (None, None, None),
            _ => {
                return Err(format!(
                    "model '{}': fallback 需同时配置 fallback_model、fallback_provider_url、fallback_provider",
                    entry.model
                ));
            }
        };

        let route = RouteInfo {
            model:                entry.model.clone(),
            provider_url:        entry.provider_url,
            provider,
            fallback_model,
            fallback_provider_url,
            fallback_provider,
        };
        map.insert(entry.model, route);
    }

    Ok(map)
}

/// 加载注册表：从配置文件读取，失败则返回错误（无内置默认，需提供 config/models.toml 或设置 REGISTRY_CONFIG）。
/// 返回 (routes, config_path) 供调用方使用；不在此处打日志，由 main 启动摘要统一输出。
pub fn load_registry() -> Result<(HashMap<String, RouteInfo>, String), String> {
    let path = std::env::var("REGISTRY_CONFIG").unwrap_or_else(|_| "config/models.toml".into());
    let routes = load_registry_from_path(&path)?;
    Ok((routes, path))
}
