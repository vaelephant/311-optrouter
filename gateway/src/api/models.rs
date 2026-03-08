//! GET /v1/models — 模型列表（从 model_pricing 表读）
//! GET /v1/models/{model}/pricing — 模型定价（从 model_pricing 表读，与计费一致）

use axum::{extract::Path, extract::State, Json};

use crate::{
    db,
    error::AppResult,
    protocol::{ModelInfo, ModelListResponse, ModelPricingResponse},
    router::RouterState,
};

pub async fn list_models(
    State(state): State<RouterState>,
) -> AppResult<Json<ModelListResponse>> {
    let rows = db::list_enabled_models(&state.db).await?;
    let data = rows.into_iter().map(|(model_name, provider, created_ts)| ModelInfo {
        id:       model_name,
        object:   "model".into(),
        created:  created_ts as u32,
        owned_by: provider,
    }).collect();
    Ok(Json(ModelListResponse { object: "list".into(), data }))
}

pub async fn get_model_pricing(
    State(state): State<RouterState>,
    Path(model): Path<String>,
) -> AppResult<Json<ModelPricingResponse>> {
    let Some((pricing, provider)) = db::get_model_pricing_with_provider(&state.db, &model).await? else {
        return Ok(Json(ModelPricingResponse {
            model_name: model,
            input_cost: 0.0,
            output_cost: 0.0,
            provider: "unknown".into(),
        }));
    };
    let input_cost: f64 = pricing.input_price.to_string().parse().unwrap_or(0.0);
    let output_cost: f64 = pricing.output_price.to_string().parse().unwrap_or(0.0);
    Ok(Json(ModelPricingResponse {
        model_name: model,
        input_cost,
        output_cost,
        provider,
    }))
}
