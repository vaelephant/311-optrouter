//! 启动时基础设施连接：Postgres 连接池 + Redis 连接管理器。
//!
//! 连接参数从 `GatewayTomlConfig` 读取（config/base.toml + config/{APP_ENV}.toml），
//! Postgres 连接带重试逻辑，避免云端 DB 冷启动或网络抖动导致启动失败。

use redis::aio::ConnectionManager;
use sqlx::PgPool;

use crate::config::GatewayTomlConfig;

/// 创建并预热 Postgres 连接池，失败时按配置重试。
///
/// 重试次数和间隔从 `toml.postgres.connect_retry_*` 读取，
/// 全部尝试失败后打印错误并退出进程。
pub async fn connect_postgres(database_url: &str, toml: &GatewayTomlConfig) -> PgPool {
    let pg = &toml.postgres;
    let max_attempts = pg.connect_retry_attempts.max(1);

    for attempt in 1..=max_attempts {
        let result = sqlx::postgres::PgPoolOptions::new()
            .max_connections(pg.max_connections)
            .min_connections(pg.min_connections)
            .acquire_timeout(std::time::Duration::from_secs(pg.acquire_timeout_secs))
            .max_lifetime(std::time::Duration::from_secs(pg.max_lifetime_secs))
            .idle_timeout(std::time::Duration::from_secs(pg.idle_timeout_secs))
            .test_before_acquire(true)
            .connect(database_url)
            .await;

        match result {
            Ok(pool) => return pool,
            Err(e) => {
                if attempt < max_attempts {
                    tracing::warn!(
                        attempt, max_attempts,
                        error = %e,
                        retry_in_secs = pg.connect_retry_wait_secs,
                        "Postgres connection failed, retrying..."
                    );
                    tokio::time::sleep(std::time::Duration::from_secs(pg.connect_retry_wait_secs)).await;
                } else {
                    tracing::error!(
                        attempt, max_attempts,
                        error = %e,
                        "Failed to connect to Postgres after all attempts"
                    );
                    std::process::exit(1);
                }
            }
        }
    }
    unreachable!()
}

/// 创建 Redis 连接管理器（自动重连）。失败时打印错误并退出进程。
pub async fn connect_redis(redis_url: &str) -> ConnectionManager {
    let client = redis::Client::open(redis_url)
        .unwrap_or_else(|e| {
            tracing::error!("Invalid REDIS_URL: {e}");
            std::process::exit(1);
        });
    redis::aio::ConnectionManager::new(client)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to connect to Redis: {e}");
            std::process::exit(1);
        })
}
