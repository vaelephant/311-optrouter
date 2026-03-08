//! GET /v1/usage — 用量统计
//!
//! TODO：从 usage_logs 表聚合查询，目前返回空数据占位。

use axum::{extract::Query, Json};
use serde::Deserialize;

use crate::{
    error::{AppError, AppResult},
    protocol::UsageStatsResponse,
};

#[derive(Debug, Deserialize)]
pub struct UsageQuery {
    user_id: Option<String>,
    /// 统计天数（默认 30，最大 365）
    days: Option<u32>,
}

pub async fn get_usage_stats(
    Query(query): Query<UsageQuery>,
) -> AppResult<Json<UsageStatsResponse>> {
    let days = query.days.unwrap_or(30);
    if days > 365 {
        return Err(AppError::BadRequest("days cannot exceed 365".into()));
    }

    // TODO: 实际从 usage_logs 聚合
    Ok(Json(UsageStatsResponse {
        user_id:      query.user_id.unwrap_or_default(),
        total_tokens: 0,
        cost:         0.0,
        requests:     0,
    }))
}
