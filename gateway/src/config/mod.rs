//! 全局配置模块
//!
//! [`AppConfig`] 在启动时从环境变量加载一次，之后以 `Arc<AppConfig>` 的形式
//! 注入所有需要它的组件（RouterState、handlers 等）。
//!
//! # 所有环境变量
//!
//! | 变量 | 模块 | 说明 |
//! |------|------|------|
//! | `DATABASE_URL` | — | Postgres 连接串 |
//! | `REDIS_URL` | — | Redis 连接串（默认 redis://127.0.0.1:6379）|
//! | `PORT` | — | 监听端口（默认 3001）|
//! | `OPENAI_API_KEY` | providers | OpenAI 平台 Key |
//! | `ANTHROPIC_API_KEY` | providers | Anthropic 平台 Key |
//! | `GOOGLE_API_KEY` | providers | Google 平台 Key |
//! | `OPENAI_BASE_URL` | providers | 覆盖 OpenAI Base URL（兼容接口）|
//! | `PROVIDER_TIMEOUT_SECS` | providers | 上游请求超时（默认 120）|
//! | `PROVIDER_POOL_MAX_IDLE` | providers | 连接池大小（默认 20）|
//! | `KEY_CACHE_TTL_SECS` | cache | API Key Redis 缓存 TTL（默认 1800）|
//! | `GATEWAY_STARTUP_CHECK_EXIT_ON_FAIL` | startup_check | 自检任一下游失败时退出（1/true 时退出，默认仅打日志）|

pub mod loader;
pub mod providers;

pub use loader::{load as load_toml, GatewayTomlConfig};
pub use providers::ProviderConfig;

use crate::router::model_router::ProviderType;

/// 全局应用配置（只读，线程间共享）
pub struct AppConfig {
    /// 各 AI Provider 的连接配置
    pub providers: ProviderConfig,
    /// API Key 元数据在 Redis 中的缓存 TTL（秒）
    pub key_cache_ttl_secs: u64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        Self::from_env_with_toml(None)
    }

    /// 使用 TOML 配置作为默认值（环境变量仍可覆盖）。
    pub fn from_env_with_toml(toml: Option<&GatewayTomlConfig>) -> Self {
        let key_ttl = std::env::var("KEY_CACHE_TTL_SECS")
            .ok().and_then(|v| v.parse().ok())
            .unwrap_or_else(|| toml.map(|t| t.cache.key_ttl_secs).unwrap_or(1800));
        Self {
            providers: ProviderConfig::from_env_with_toml(toml.map(|t| &t.providers)),
            key_cache_ttl_secs: key_ttl,
        }
    }

    /// 获取指定 Provider 类型的 API Key
    pub fn api_key_for(&self, provider: &ProviderType) -> Option<&str> {
        match provider {
            ProviderType::OpenAI | ProviderType::Unknown => {
                self.providers.openai_api_key.as_deref()
            }
            ProviderType::Anthropic => self.providers.anthropic_api_key.as_deref(),
            ProviderType::Google    => self.providers.google_api_key.as_deref(),
            ProviderType::Together => self.providers.together_api_key.as_deref(),
            ProviderType::Ollama => self.providers.ollama_api_key.as_deref(),
        }
    }

    /// 获取指定 Provider 的 Base URL
    #[allow(dead_code)]
    pub fn base_url_for(&self, provider: &ProviderType) -> &str {
        match provider {
            ProviderType::OpenAI | ProviderType::Unknown => &self.providers.openai_base_url,
            ProviderType::Anthropic => &self.providers.anthropic_base_url,
            ProviderType::Google    => &self.providers.google_base_url,
            ProviderType::Together => &self.providers.together_base_url,
            ProviderType::Ollama => &self.providers.ollama_base_url,
        }
    }
}
