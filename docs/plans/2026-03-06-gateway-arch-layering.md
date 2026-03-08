# Gateway Architecture Layering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 gateway 从"结构对了"升级为"职责边界固定、长期可维护"——新增 `application/` 编排层、让 `main.rs` 只做启动、把 `startup_check.rs` 归入 `startup/` 模块、更新 `lib.rs` 暴露 `build_app`/`build_state`。

**Architecture:** 三层调用链：`api`（HTTP 解析/响应）→ `application`（流程编排）→ `providers/db/router`（能力层）。`main.rs` 只负责 init log、load env、调用 `lib::run()`，所有组装逻辑下沉到 `lib.rs`。

**Tech Stack:** Rust, Axum 0.7, sqlx, redis, tokio, tracing

---

## 现状速览

```
gateway/src/
├── main.rs          181 行  — 启动 + 路由注册 + print_startup_summary（需瘦身）
├── lib.rs            34 行  — 只有 pub mod 列表（需加 build_app/build_state）
├── api/
│   └── chat.rs      345 行  — 混合认证/限流/余额/provider/扣费（需抽 application 层）
├── startup_check.rs  ~120 行 — 独立文件（需搬到 startup/）
└── ...
```

**本计划目标目录结构：**

```
gateway/src/
├── main.rs          ~30 行  — init log + dotenv + lib::run()
├── lib.rs           ~60 行  — build_app() / build_state() / run() / pub mod
├── startup/
│   ├── mod.rs
│   ├── bootstrap.rs         — DB/Redis 连接，返回 (PgPool, ConnectionManager)
│   └── healthcheck.rs       — check_upstreams / check_api_reachable / print_summary
├── application/
│   ├── mod.rs
│   ├── chat_service.rs      — authenticate → balance_check → route → call → bill
│   └── auth_service.rs      — authenticate() 单独抽出
├── api/
│   └── chat.rs      ~60 行  — 只做 HTTP parse + call application + build Response
└── ...（其余文件不动）
```

---

## Task 1：新建 `startup/` 模块，迁移 `startup_check.rs`

**Files:**
- Create: `gateway/src/startup/mod.rs`
- Create: `gateway/src/startup/healthcheck.rs`  （从 startup_check.rs 复制 + 重命名）
- Create: `gateway/src/startup/bootstrap.rs`  （DB/Redis 连接逻辑从 main.rs 提取）
- Delete: `gateway/src/startup_check.rs`
- Modify: `gateway/src/main.rs`  （更新 mod + use 路径）
- Modify: `gateway/src/lib.rs`  （加 pub mod startup）

**Step 1: 创建 `startup/healthcheck.rs`**

内容：把 `startup_check.rs` 原样复制，模块注释更新。保持函数签名完全不变：
```rust
pub struct UpstreamResult { ... }
pub async fn check_upstreams(config: Arc<AppConfig>) -> Vec<UpstreamResult>
pub async fn check_api_reachable(port: u16) -> bool
```

**Step 2: 创建 `startup/bootstrap.rs`**

把 main.rs 里 Postgres/Redis 连接代码提取为函数：
```rust
use redis::aio::ConnectionManager;
use sqlx::PgPool;

pub async fn connect_postgres(database_url: &str) -> PgPool {
    sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .idle_timeout(std::time::Duration::from_secs(300))
        .test_before_acquire(true)
        .connect(database_url)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to connect to Postgres: {e}");
            std::process::exit(1);
        })
}

pub async fn connect_redis(redis_url: &str) -> ConnectionManager {
    let client = redis::Client::open(redis_url)
        .unwrap_or_else(|e| { tracing::error!("Invalid REDIS_URL: {e}"); std::process::exit(1); });
    redis::aio::ConnectionManager::new(client)
        .await
        .unwrap_or_else(|e| { tracing::error!("Failed to connect to Redis: {e}"); std::process::exit(1); })
}
```

**Step 3: 创建 `startup/mod.rs`**

```rust
pub mod bootstrap;
pub mod healthcheck;

pub use healthcheck::{check_api_reachable, check_upstreams, UpstreamResult};
```

**Step 4: 在 `lib.rs` 添加 `pub mod startup;`**

**Step 5: 修改 `main.rs`，删除 `mod startup_check;`，改用 `opt_router_gateway::startup`**
（main.rs 里目前对 startup_check 的引用路径改成 `startup::check_upstreams` 等）

**Step 6: 删除 `gateway/src/startup_check.rs`**

**Step 7: 编译验证**
```bash
cd gateway && cargo build 2>&1
```
Expected: 0 errors.

**Step 8: Commit**
```bash
git add gateway/src/startup/ gateway/src/lib.rs gateway/src/main.rs
git rm gateway/src/startup_check.rs
git commit -m "refactor(gateway): move startup_check into startup/ module"
```

---

## Task 2：新建 `application/auth_service.rs`，抽出认证逻辑

**Files:**
- Create: `gateway/src/application/mod.rs`
- Create: `gateway/src/application/auth_service.rs`
- Modify: `gateway/src/api/chat.rs`  （删掉本地 authenticate 函数，改 use）
- Modify: `gateway/src/lib.rs`  （加 pub mod application）

**Step 1: 创建 `application/auth_service.rs`**

把 `api/chat.rs` 里的 `authenticate()` 函数原样搬过来（连同它用到的 use 路径）：

```rust
//! 认证服务：从 Redis 缓存或 Postgres 验证 API Key，返回 ApiKeyMeta。

use axum::http::HeaderMap;

use crate::{
    db::{self, ApiKeyMeta, cache_get_key_meta, cache_set_key_meta},
    error::{AppError, AppResult},
    middleware::auth::{extract_bearer, sha256_hex},
    router::RouterState,
};

pub async fn authenticate(state: &RouterState, headers: &HeaderMap) -> AppResult<ApiKeyMeta> {
    let api_key  = extract_bearer(headers)
        .ok_or_else(|| AppError::Authentication("Missing API key".into()))?;
    let key_hash = sha256_hex(&api_key);

    let mut redis = state.redis.clone();
    let meta = if let Some(cached) = cache_get_key_meta(&mut redis, &key_hash).await {
        cached
    } else {
        let from_db = db::validate_key_from_db(&state.db, &key_hash).await?
            .ok_or_else(|| AppError::Authentication("Invalid API key".into()))?;
        let ttl = state.config.key_cache_ttl_secs;
        cache_set_key_meta(&mut redis, &key_hash, &from_db, ttl).await;
        from_db
    };

    if meta.status != "active" {
        return Err(AppError::Authorization(format!("API key is '{}'", meta.status)));
    }
    Ok(meta)
}
```

**Step 2: 创建 `application/mod.rs`**

```rust
pub mod auth_service;

pub use auth_service::authenticate;
```

**Step 3: 修改 `api/chat.rs`**

- 删掉文件末尾的 `async fn authenticate(...)` 函数
- 在顶部 use 添加：`use crate::application::authenticate;`

**Step 4: 修改 `lib.rs`，添加 `pub mod application;`**

**Step 5: 编译验证**
```bash
cd gateway && cargo build 2>&1
```
Expected: 0 errors.

**Step 6: Commit**
```bash
git add gateway/src/application/ gateway/src/api/chat.rs gateway/src/lib.rs
git commit -m "refactor(gateway): extract authenticate() into application/auth_service"
```

---

## Task 3：新建 `application/chat_service.rs`，把 `api/chat.rs` 的业务逻辑下沉

这是最重要的一步。`api/chat.rs` 当前把认证、限流、余额检查、provider调用、流/非流处理、扣费全混在一起。目标：

- `api/chat.rs` 保留：HTTP parse → 调 `ChatService::handle()` → 返回 `Response`
- `application/chat_service.rs` 承载：业务流程全部

**Files:**
- Create: `gateway/src/application/chat_service.rs`
- Modify: `gateway/src/application/mod.rs`
- Modify: `gateway/src/api/chat.rs`（大幅精简）

**Step 1: 创建 `application/chat_service.rs`**

把 `api/chat.rs` 里以下函数 **整体迁移**：
- `handle_non_stream()`
- `handle_stream()`
- `call_with_fallback()`
- `has_fallback()`

以及在 `chat_completions` 里的业务逻辑：限流检查、余额预检、模型验证、定价查询、路由决策。

迁移后对外暴露一个入口函数：

```rust
/// 处理一次 chat completions 请求的完整业务流程。
/// api 层只传入 state / headers / request，返回 axum Response。
pub async fn handle_chat(
    state: RouterState,
    headers: HeaderMap,
    request: ChatCompletionRequest,
) -> AppResult<Response> {
    // （原 chat_completions 的全部逻辑，除 HTTP 解包之外）
    ...
}
```

`handle_non_stream` / `handle_stream` / `call_with_fallback` 保持 `pub(crate)` 或 `pub`（由 handle_chat 调用）。

**Step 2: 修改 `application/mod.rs`**

```rust
pub mod auth_service;
pub mod chat_service;

pub use auth_service::authenticate;
pub use chat_service::handle_chat;
```

**Step 3: 精简 `api/chat.rs`**

精简后 `chat_completions` 变成：

```rust
pub async fn chat_completions(
    State(state): State<RouterState>,
    headers: HeaderMap,
    Json(request): Json<ChatCompletionRequest>,
) -> AppResult<Response> {
    application::chat_service::handle_chat(state, headers, request).await
}
```

`debug_echo` 保留（只用于测试，无业务逻辑），其余函数全部删除。

**Step 4: 编译验证**
```bash
cd gateway && cargo build 2>&1
```
Expected: 0 errors.

**Step 5: Commit**
```bash
git add gateway/src/application/chat_service.rs \
        gateway/src/application/mod.rs \
        gateway/src/api/chat.rs
git commit -m "refactor(gateway): extract chat business logic into application/chat_service"
```

---

## Task 4：`lib.rs` 添加 `build_app()` / `build_state()` / `run()`，`main.rs` 瘦身

**Files:**
- Modify: `gateway/src/lib.rs`
- Modify: `gateway/src/main.rs`

**Step 1: 在 `lib.rs` 添加 `build_state()` 函数**

```rust
use std::net::SocketAddr;
use axum::{routing::{get, post}, Router};
use tower_http::cors::{Any, CorsLayer};

pub async fn build_state(
    db: sqlx::PgPool,
    redis: redis::aio::ConnectionManager,
) -> router::RouterState {
    router::RouterState::new(db, redis)
}

pub fn build_app(state: router::RouterState) -> Router {
    let cors = CorsLayer::new().allow_origin(Any).allow_methods(Any).allow_headers(Any);
    Router::new()
        .route("/health",                    get(api::health::health_check))
        .route("/v1/models",                 get(api::models::list_models))
        .route("/v1/models/{model}/pricing", get(api::models::get_model_pricing))
        .route("/v1/chat/completions",       post(api::chat::chat_completions))
        .route("/v1/usage",                  get(api::usage::get_usage_stats))
        .route("/debug/echo",                post(api::chat::debug_echo).get(api::chat::debug_echo))
        .with_state(state)
        .layer(cors)
        .layer(tower_http::trace::TraceLayer::new_for_http())
}

/// 完整启动流程（供 main.rs 调用）。
pub async fn run() {
    use startup::{bootstrap, healthcheck};

    public::logo::print();

    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into());

    let db    = bootstrap::connect_postgres(&database_url).await;
    let redis = bootstrap::connect_redis(&redis_url).await;

    let state = build_state(db, redis).await;
    let model_count  = state.model_router.list_models().await.len();
    let registry_path = std::env::var("REGISTRY_CONFIG").unwrap_or_else(|_| "config/models.toml".into());

    let upstream_results = healthcheck::check_upstreams(state.config.clone()).await;
    let app = build_app(state.clone());   // state 需要 Clone（已经是 Arc 级别）

    let port: u16 = std::env::var("PORT")
        .unwrap_or_else(|_| "3001".into()).parse().expect("PORT must be a number");
    let addr = SocketAddr::from(([0, 0, 0, 0], port));

    let listener = tokio::net::TcpListener::bind(addr).await
        .unwrap_or_else(|e| { tracing::error!("bind failed: {e}"); std::process::exit(1); });

    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(shutdown_signal())
            .await
            .unwrap_or_else(|e| tracing::error!("Server error: {e}"));
    });

    let api_ok = healthcheck::check_api_reachable(port).await;
    healthcheck::print_startup_summary(addr, model_count, &registry_path, &upstream_results, api_ok);

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
```

注意：`print_startup_summary` 和 ANSI 颜色常量需要从 `main.rs` 移到 `startup/healthcheck.rs`。

**Step 2: 精简 `main.rs`**

```rust
#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,opt_router_gateway=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    dotenv::dotenv().ok();

    opt_router_gateway::run().await;
}
```

**Step 3: 编译验证**
```bash
cd gateway && cargo build 2>&1
```
Expected: 0 errors.

**Step 4: Commit**
```bash
git add gateway/src/lib.rs gateway/src/main.rs
git commit -m "refactor(gateway): slim main.rs, add build_app/build_state/run to lib"
```

---

## Task 5：更新 `lib.rs` 模块注释 + 更新 README 目录说明

**Files:**
- Modify: `gateway/src/lib.rs`（顶部注释更新成最新模块图）
- Modify: `README.md`（找到目录说明章节，更新）

**Step 1: 更新 `lib.rs` 顶部注释**

```rust
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
```

**Step 2: 找到 README 里的目录说明章节，更新**

用 rg 搜索 "handlers" 或 "目录" 关键词定位章节：
```bash
rg -n "handlers\|目录结构\|src/" /Users/yan/code/309-153router/README.md | head -20
```

替换成与当前代码一致的目录结构（含 application/ 新模块）。

**Step 3: 编译验证**
```bash
cd gateway && cargo build 2>&1
```

**Step 4: Commit**
```bash
git add gateway/src/lib.rs README.md
git commit -m "docs: update lib.rs module map and README directory structure"
```

---

## 完成后验证

```bash
cd /Users/yan/code/309-153router/gateway

# 编译
cargo build

# 检查 main.rs 行数（目标 < 20 行）
wc -l src/main.rs

# 检查 api/chat.rs 行数（目标 < 60 行）
wc -l src/api/chat.rs

# 检查 application/chat_service.rs 是否存在
ls src/application/

# 检查 startup/ 是否存在
ls src/startup/
```

---

## 参考：最终目录

```
gateway/src/
├── main.rs                  ~20 行  init log + dotenv + run()
├── lib.rs                   ~80 行  build_app / build_state / run / pub mod
├── error.rs
├── startup/
│   ├── mod.rs
│   ├── bootstrap.rs         DB/Redis 连接函数
│   └── healthcheck.rs       上游检查 + 启动摘要
├── application/
│   ├── mod.rs
│   ├── auth_service.rs      authenticate()
│   └── chat_service.rs      handle_chat()、handle_stream、handle_non_stream、call_with_fallback
├── api/
│   ├── mod.rs
│   ├── chat.rs              ~50 行：HTTP parse → call application → Response
│   ├── models.rs
│   ├── usage.rs
│   └── health.rs
├── config/
├── db/
├── metrics/
├── middleware/
├── protocol/
├── providers/
├── proxy/
├── router/
└── public/
```
