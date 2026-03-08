//! Gateway 二进制入口
//!
//! 职责：初始化日志、加载 .env、调用 `opt_router_gateway::run()` 完成所有启动流程。

use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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
