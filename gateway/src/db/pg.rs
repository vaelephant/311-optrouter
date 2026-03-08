//! Postgres 数据库操作
//!
//! 包含三类操作：
//!
//! 1. **Key 验证**（[`validate_key_from_db`]）
//!    - `WHERE key_hash = $1` 精确查询，结果由 Redis 层缓存
//!
//! 2. **定价查询**（[`get_model_pricing`]）
//!    - `WHERE model_name = $1 AND enabled = true`
//!
//! 3. **原子扣费事务**（[`bill_in_tx`]）
//!    - 6 步 DB 操作全在同一个 `BEGIN ... COMMIT` 内
//!    - 任一步骤失败 → 自动 ROLLBACK，保证财务数据一致性
//!
//! # 为什么用 `sqlx::query_as()` 而非 `sqlx::query!` 宏？
//!
//! `query!` 宏需要在编译时连接数据库（或提前生成 `sqlx-data.json`）。
//! 为了让开发者在没有 DB 的情况下也能编译运行，此处使用运行时类型检查的
//! `query_as()`。代价是编译期无法发现 SQL 语法错误（由 CI 的集成测试覆盖）。

use bigdecimal::BigDecimal;
use sqlx::PgPool;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use super::types::{ApiKeyMeta, BillArgs, ModelPricingInfo};

// ─── Key 验证 ─────────────────────────────────────────────────────────────────

/// 按 `key_hash` 从 `api_keys` 表查询 Key 元数据。
///
/// **此函数只在 Redis 缓存未命中时调用**。
/// 调用方负责将结果写回 Redis（[`super::redis::cache_set_key_meta`]）。
pub async fn validate_key_from_db(
    pool:     &PgPool,
    key_hash: &str,
) -> AppResult<Option<ApiKeyMeta>> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id:                 Uuid,
        user_id:            Uuid,
        status:             String,
        rate_limit_per_min: i32,
    }

    let row: Option<Row> = sqlx::query_as(
        "SELECT id, user_id, status::text AS status, rate_limit_per_min \
         FROM api_keys \
         WHERE key_hash = $1",
    )
    .bind(key_hash)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(format!("db validate_key: {e}")))?;

    Ok(row.map(|r| ApiKeyMeta {
        api_key_id:         r.id,
        user_id:            r.user_id,
        status:             r.status,
        rate_limit_per_min: r.rate_limit_per_min,
    }))
}

// ─── 模型定价 ─────────────────────────────────────────────────────────────────

/// 从 `model_pricing` 表查询指定模型的单价。
///
/// 返回 `None` 表示该模型未配置定价或已禁用，handler 应拒绝请求（400）。
pub async fn get_model_pricing(
    pool:  &PgPool,
    model: &str,
) -> AppResult<Option<ModelPricingInfo>> {
    #[derive(sqlx::FromRow)]
    struct Row {
        input_price:  BigDecimal,
        output_price: BigDecimal,
    }

    let row: Option<Row> = sqlx::query_as(
        "SELECT input_price, output_price \
         FROM model_pricing \
         WHERE model_name = $1 AND enabled = true",
    )
    .bind(model)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(format!("db get_pricing: {e}")))?;

    Ok(row.map(|r| ModelPricingInfo {
        input_price:  r.input_price,
        output_price: r.output_price,
    }))
}

/// 查询单个模型定价并返回 provider（供 GET /v1/models/:model/pricing 使用）。
pub async fn get_model_pricing_with_provider(
    pool:  &PgPool,
    model: &str,
) -> AppResult<Option<(ModelPricingInfo, String)>> {
    #[derive(sqlx::FromRow)]
    struct Row {
        input_price:  BigDecimal,
        output_price: BigDecimal,
        provider:     String,
    }

    let row: Option<Row> = sqlx::query_as(
        "SELECT input_price, output_price, provider \
         FROM model_pricing \
         WHERE model_name = $1 AND enabled = true",
    )
    .bind(model)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(format!("db get_pricing: {e}")))?;

    Ok(row.map(|r| (
        ModelPricingInfo {
            input_price:  r.input_price,
            output_price: r.output_price,
        },
        r.provider,
    )))
}

/// 列出所有已启用的模型（供 GET /v1/models 使用）。
pub async fn list_enabled_models(pool: &PgPool) -> AppResult<Vec<(String, String, i64)>> {
    #[derive(sqlx::FromRow)]
    struct Row {
        model_name: String,
        provider:   String,
        created_at: chrono::DateTime<chrono::Utc>,
    }

    let rows: Vec<Row> = sqlx::query_as(
        "SELECT model_name, provider, created_at \
         FROM model_pricing \
         WHERE enabled = true \
         ORDER BY model_name",
    )
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::Internal(format!("db list_models: {e}")))?;

    Ok(rows.into_iter().map(|r| (
        r.model_name,
        r.provider,
        r.created_at.timestamp(),
    )).collect())
}

// ─── 用户余额（调用前预检）────────────────────────────────────────────────────

/// 查询用户当前余额（只读，不开启事务）。
/// 若用户尚无 `user_balances` 记录则视为 0。
/// 用于在发起上游请求前预检，避免无余额仍生成内容。
pub async fn get_user_balance(pool: &PgPool, user_id: Uuid) -> AppResult<BigDecimal> {
    #[derive(sqlx::FromRow)]
    struct Row { balance: BigDecimal }

    let row: Option<Row> = sqlx::query_as(
        "SELECT balance FROM user_balances WHERE user_id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::Internal(format!("db get_balance: {e}")))?;

    Ok(row.map(|r| r.balance).unwrap_or_else(|| BigDecimal::from(0)))
}

// ─── 原子扣费事务 ─────────────────────────────────────────────────────────────
///
/// ```text
/// BEGIN
///   1. INSERT INTO user_balances ... ON CONFLICT DO NOTHING   -- 新用户初始化
///   2. SELECT balance FROM user_balances FOR UPDATE            -- 行级锁
///   3. 检查 balance >= cost                                    -- 余额不足 → ROLLBACK + 402
///   4. INSERT INTO usage_logs                                  -- 记录本次调用
///   5. UPDATE user_balances SET balance = balance - cost       -- 扣费
///   6. INSERT INTO transactions (amount = -cost)              -- 财务流水
/// COMMIT
/// ```
///
/// 所有步骤使用同一个 `Transaction`，任意一步失败则回滚，
/// 确保 usage_logs / balance / transactions 三张表始终一致。
pub async fn bill_in_tx(pool: &PgPool, args: BillArgs) -> AppResult<()> {
    let mut tx = pool
        .begin()
        .await
        .map_err(|e| AppError::Internal(format!("tx begin: {e}")))?;

    // ── 1. 原子扣费：一条 SQL 完成余额检查 + 扣减，无需 FOR UPDATE ──────────
    // 如果余额不足（balance < cost），UPDATE 影响 0 行，返回 None
    #[derive(sqlx::FromRow)]
    struct BalRow { balance: BigDecimal }

    let result: Option<BalRow> = sqlx::query_as(
        "UPDATE user_balances \
         SET balance = balance - $1, updated_at = NOW() \
         WHERE user_id = $2 AND balance >= $1 \
         RETURNING balance",
    )
    .bind(&args.cost)
    .bind(args.user_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(format!("atomic deduct: {e}")))?;

    let new_balance = match result {
        Some(r) => r.balance,
        None => {
            // 可能是新用户（行不存在）或余额不足，先确保行存在再判断
            sqlx::query(
                "INSERT INTO user_balances (user_id, balance) VALUES ($1, 0) \
                 ON CONFLICT (user_id) DO NOTHING",
            )
            .bind(args.user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| AppError::Internal(format!("ensure balance row: {e}")))?;

            // 再试一次原子扣费
            let r2: Option<BalRow> = sqlx::query_as(
                "UPDATE user_balances \
                 SET balance = balance - $1, updated_at = NOW() \
                 WHERE user_id = $2 AND balance >= $1 \
                 RETURNING balance",
            )
            .bind(&args.cost)
            .bind(args.user_id)
            .fetch_optional(&mut *tx)
            .await
            .map_err(|e| AppError::Internal(format!("atomic deduct retry: {e}")))?;

            match r2 {
                Some(r) => r.balance,
                None => {
                    let _ = tx.rollback().await;
                    return Err(AppError::InsufficientBalance(
                        format!("insufficient balance for cost {:.6}", args.cost)
                    ));
                }
            }
        }
    };

    // ── 2. 写 usage_logs（含 requested_model, provider, request_id）─────────
    sqlx::query(
        "INSERT INTO usage_logs \
            (user_id, api_key_id, model, requested_model, provider, request_id, \
             input_tokens, output_tokens, total_tokens, cost, latency_ms, status) \
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'success'::\"UsageStatus\")",
    )
    .bind(args.user_id)
    .bind(args.api_key_id)
    .bind(&args.model)
    .bind(args.requested_model.as_deref())
    .bind(args.provider.as_deref())
    .bind(args.request_id.as_deref())
    .bind(args.input_tokens)
    .bind(args.output_tokens)
    .bind(args.total_tokens)
    .bind(&args.cost)
    .bind(args.latency_ms)
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(format!("insert usage_log: {e}")))?;

    // ── 3. 写财务流水（负值 = 支出）─────────────────────────────────────────
    let neg_cost = -args.cost.clone();
    sqlx::query(
        "INSERT INTO transactions (user_id, amount, type, description) \
         VALUES ($1, $2, 'usage'::\"TransactionType\", $3)",
    )
    .bind(args.user_id)
    .bind(&neg_cost)
    .bind(format!("model={}, tokens={}", args.model, args.total_tokens))
    .execute(&mut *tx)
    .await
    .map_err(|e| AppError::Internal(format!("insert transaction: {e}")))?;

    // ── 4. 提交 ──────────────────────────────────────────────────────────────
    tx.commit()
        .await
        .map_err(|e| AppError::Internal(format!("tx commit: {e}")))?;

    // ── 5. pg_notify 移到事务外（避免锁住事务 3~4 秒）──────────────────────
    let payload = format!(
        r#"{{"user_id":"{}","balance":"{}"}}"#,
        args.user_id, new_balance
    );
    let _ = sqlx::query("SELECT pg_notify('user_balance_changed', $1)")
        .bind(&payload)
        .execute(pool)
        .await;  // 失败只记录，不影响主流程

    Ok(())
}
