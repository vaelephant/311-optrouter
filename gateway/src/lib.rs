//! OptRouter Gateway — 库入口
//!
//! # 模块结构
//!
//! ```text
//! api/           HTTP 层（只做请求解析 + 调用 application + 返回 Response）
//! application/   应用编排层（鉴权 → 限流 → 余额 → 路由 → 调 provider → 扣费）
//!   ├─ auth_service.rs    API Key 验证（Redis 缓存 + Postgres 回源）
//!   └─ chat_service.rs    chat completions 完整业务流程
//! config/        全局配置（AppConfig + ProviderConfig）
//! db/            数据库访问层
//!   ├─ pg.rs       Postgres：Key 验证、原子扣费、定价查询
//!   ├─ redis.rs    Redis：Key 元数据缓存
//!   └─ types.rs    领域类型：ApiKeyMeta、BillArgs、ModelPricingInfo
//! error          统一错误类型（AppError / AppResult）
//! metrics/       指标与计量（compute_cost，BigDecimal 精度）
//! middleware/    HTTP 工具（extract_bearer、sha256_hex）
//! protocol/      对外 API 协议结构（OpenAI 兼容格式）
//! providers/     AI Provider 适配层（OpenAI / Anthropic / Google / Together / Ollama）
//! proxy/         SSE / stream 代理层（AccountingStream 透传 + usage 截取）
//! router/        模型路由策略
//!   ├─ model_router.rs  ProviderType、RouteInfo、ModelRouter
//!   └─ registry.rs      从 config/models.toml 加载注册表
//! startup/       启动与自检
//!   ├─ bootstrap.rs     Postgres / Redis 连接
//!   └─ healthcheck.rs   上游联通检查 + API 自检 + 启动摘要打印
//! ```

pub mod api;
pub mod application;
pub mod config;
pub mod db;
pub mod error;
pub mod metrics;
pub mod middleware;
pub mod protocol;
pub mod providers;
pub mod proxy;
pub mod public;
pub mod router;
pub mod startup;

pub use error::{AppError, AppResult};

// ─── 公开构建函数（供测试、集成测试、基准测试使用）────────────────────────────

use std::net::SocketAddr;
use axum::{routing::{get, post}, Router};
use tower_http::cors::{Any, CorsLayer};

/// 构造 Axum Router，注册所有路由和中间件。
/// 与 `build_state` 分离，方便测试时替换 state。
pub fn build_app(state: router::RouterState) -> Router {
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    Router::new()
        .route("/health",                    get(api::health::health_check))
        .route("/health/models",             get(api::health_models::health_models))
        .route("/v1/models",                 get(api::models::list_models))
        .route("/v1/models/{model}/pricing", get(api::models::get_model_pricing))
        .route("/v1/chat/completions",       post(api::chat::chat_completions))
        .route("/v1/usage",                  get(api::usage::get_usage_stats))
        .route("/v1/admin/config/reload",    post(api::admin::reload_config))
        .route("/debug/echo",                post(api::chat::debug_echo).get(api::chat::debug_echo))
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
}

/// 构造 RouterState（连接已建立后调用）。
pub fn build_state(
    db: sqlx::PgPool,
    redis: redis::aio::ConnectionManager,
    toml: Option<&config::GatewayTomlConfig>,
) -> router::RouterState {
    router::RouterState::new_with_toml(db, redis, toml)
}

/// 完整启动流程：连接基础设施 → 自检 → 监听端口 → 打印摘要 → 进入服务循环。
/// `main.rs` 只需调用此函数。
pub async fn run() {
    use startup::{bootstrap, healthcheck};

    public::logo::print();

    let toml_cfg  = config::load_toml();
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    // REDIS_URL 环境变量优先，其次 TOML，最后默认值
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| toml_cfg.redis.url.clone());

    let db    = bootstrap::connect_postgres(&database_url, &toml_cfg).await;
    let redis = bootstrap::connect_redis(&redis_url).await;

    let state = build_state(db, redis, Some(&toml_cfg));
    
    // 从数据库初始化路由表
    if let Err(e) = state.init_model_router().await {
        tracing::error!("Failed to initialize model router from DB: {e}");
        std::process::exit(1);
    }

    let model_count        = state.model_router.list_models().await.len();
    let models_by_provider = state.model_router.models_by_provider().await;

    let upstream_results = healthcheck::check_upstreams(state.config.clone()).await;
    let app = build_app(state);

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".into()).parse().expect("PORT must be a number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to bind to {addr}: {e}");
            std::process::exit(1);
        });

    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap_or_else(|e| tracing::error!("Server error: {e}"));
    });

    let api_ok = healthcheck::check_api_reachable(port).await;
    healthcheck::print_startup_summary(
        addr, model_count, "Database (model_pricing table)",
        &upstream_results, &models_by_provider, api_ok,
    );

    server.await.expect("server task panicked");
    tracing::info!("Gateway shut down cleanly.");
}

async fn shutdown_signal() {
    let ctrl_c = async { tokio::signal::ctrl_c().await.expect("ctrl-c handler failed") };
    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler failed").recv().await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();
    tokio::select! {
        _ = ctrl_c    => tracing::info!("Ctrl-C received"),
        _ = terminate => tracing::info!("SIGTERM received"),
    }
}

