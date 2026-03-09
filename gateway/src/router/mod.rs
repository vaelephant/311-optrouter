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
pub mod strategy;
pub mod types;

pub use model_router::{ModelRouter, ProviderType, RouteInfo, IntelligentRouteResult};
pub use registry::load_registry_from_db;
pub use strategy::{CoarseRouter, ContextualRouter, HeuristicScorer};
pub use types::*;

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
    pub db: sqlx::PgPool,

    /// Redis 连接管理器
    pub redis: redis::aio::ConnectionManager,

    /// reqwest 共享连接池
    pub http_client: reqwest::Client,

    /// 模型 → Provider 路由表
    pub model_router: ModelRouter,

    /// 全局配置
    pub config: Arc<AppConfig>,

    /// 按 api_key_id 的限流器
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

        let http_client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(config.providers.timeout_secs))
            .build()
            .expect("failed to build reqwest client");

        // 初始化空的路由表
        let model_router = ModelRouter::new(std::collections::HashMap::new(), config.providers.openai_base_url.clone());

        Self {
            db,
            redis,
            http_client,
            model_router,
            config,
            limiters: Arc::new(DashMap::new()),
        }
    }

    /// 从数据库初始化路由表
    pub async fn init_model_router(&self) -> Result<(), String> {
        let routes = load_registry_from_db(&self.db).await?;
        self.model_router.update_routes(routes).await;
        Ok(())
    }

    /// 获取或创建该 API Key 的限流器
    pub fn check_rate_limit(&self, api_key_id: Uuid, rate_limit_per_min: i32) -> Result<(), ()> {
        let n = rate_limit_per_min.max(1) as u32;
        let quota = Quota::per_minute(NonZeroU32::new(n).unwrap_or(NonZeroU32::MIN));
        let limiter = self.limiters
            .entry(api_key_id)
            .or_insert_with(|| RateLimiter::direct(quota));
        limiter.check().map_err(|_| ())
    }
}
