//! 路由层入口
//!
//! # 子模块
//!
//! | 模块 | 职责 |
//! |------|------|
//! | [`model_router`] | `ProviderType`、`RouteInfo`、`ModelRouter`（路由决策）|
//! | [`registry`]     | 从配置文件加载模型注册表（config/models.toml）|
//!
//! # RouterState
//!
//! Axum 共享状态，通过 `Router::with_state(state)` 注入。
//! 所有字段均为 Arc 级别 Clone，clone 开销极低。

pub mod model_router;
pub mod registry;

pub use model_router::{ModelRouter, ProviderType, RouteInfo};
pub use registry::load_registry;

use std::sync::Arc;

use dashmap::DashMap;
use governor::{Quota, RateLimiter};
use std::num::NonZeroU32;
use uuid::Uuid;

use crate::config::AppConfig;

/// 按 API Key 的限流器缓存：每个 key 一个 direct RateLimiter，quota 来自 DB 的 rate_limit_per_min
type Limiter = governor::DefaultDirectRateLimiter;

/// Axum 全局共享状态
#[derive(Clone)]
pub struct RouterState {
    /// Postgres 连接池
    /// - Key 验证（缓存未命中时回源）
    /// - 原子扣费事务
    /// - 模型定价查询
    pub db: sqlx::PgPool,

    /// Redis 连接管理器（自动重连）
    /// - Key 元数据缓存（TTL 30min）
    /// - 吊销时立即删除（Next.js 调用）
    pub redis: redis::aio::ConnectionManager,

    /// reqwest 共享连接池（转发请求到 AI Provider）
    pub http_client: reqwest::Client,

    /// 模型 → Provider 路由表
    pub model_router: ModelRouter,

    /// 全局配置（Provider API Key、缓存 TTL 等）
    pub config: Arc<AppConfig>,

    /// 按 api_key_id 的限流器（每分钟请求数来自 api_keys.rate_limit_per_min）
    pub limiters: Arc<DashMap<Uuid, Limiter>>,
}

impl RouterState {
    pub fn new(db: sqlx::PgPool, redis: redis::aio::ConnectionManager) -> Self {
        Self::new_with_toml(db, redis, None)
    }

    pub fn new_with_toml(
        db: sqlx::PgPool,
        redis: redis::aio::ConnectionManager,
        toml: Option<&crate::config::GatewayTomlConfig>,
    ) -> Self {
        let config = Arc::new(AppConfig::from_env_with_toml(toml));

        // 读取代理配置（来自 .env）
        let proxy_enabled = std::env::var("PROXY_ENABLED")
            .map(|v| v.to_lowercase() == "true")
            .unwrap_or(false);
        let proxy_url = std::env::var("PROXY_URL").ok();

        let mut builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.providers.timeout_secs))
            .pool_max_idle_per_host(config.providers.pool_max_idle);

        if proxy_enabled {
            if let Some(url) = &proxy_url {
                match reqwest::Proxy::all(url) {
                    Ok(proxy) => {
                        builder = builder.proxy(proxy);
                        tracing::info!("HTTP client proxy enabled: {}", url);
                    }
                    Err(e) => {
                        tracing::warn!("Invalid PROXY_URL '{}', proxy disabled: {}", url, e);
                    }
                }
            } else {
                tracing::warn!("PROXY_ENABLED=true but PROXY_URL is not set, proxy disabled");
            }
        }

        let http_client = builder
            .build()
            .expect("failed to build reqwest client");

        let (routes, _registry_path) = load_registry().unwrap_or_else(|e| {
            tracing::error!("Registry config failed: {e}. Set REGISTRY_CONFIG or add config/models.toml");
            std::process::exit(1);
        });
        let model_router = ModelRouter::new(routes, config.providers.openai_base_url.clone());

        Self {
            db,
            redis,
            http_client,
            model_router,
            config,
            limiters: Arc::new(DashMap::new()),
        }
    }

    /// 获取或创建该 API Key 的限流器，并检查是否允许通过。返回 Ok(()) 表示通过，Err 表示超限应返回 429。
    pub fn check_rate_limit(&self, api_key_id: Uuid, rate_limit_per_min: i32) -> Result<(), ()> {
        let n = rate_limit_per_min.max(1) as u32;
        let quota = Quota::per_minute(NonZeroU32::new(n).unwrap_or(NonZeroU32::MIN));
        let limiter = self.limiters
            .entry(api_key_id)
            .or_insert_with(|| RateLimiter::direct(quota));
        limiter.check().map_err(|_| ())
    }
}
