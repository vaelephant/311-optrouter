//! Chat 应用服务：鉴权 → 限流 → 余额预检 → 路由 → 调用 Provider → 扣费。
//!
//! ```text
//! authenticate → rate_limit → balance_check → get_pricing → route
//!     ↓ 非流式                      ↓ 流式
//! call_with_fallback            call_with_fallback
//! convert_response              AccountingStream 透传 SSE
//! bill_in_tx (async spawn)      bill_in_tx (async spawn)
//! return JSON Response          return text/event-stream Response
//! ```

use std::time::Instant;

use axum::{body::Body, http::HeaderMap, http::StatusCode, response::Response};
use futures::StreamExt;
use tracing::{error, info, warn};

use crate::{
    application::auth_service::authenticate,
    db::{self, BillArgs, ModelPricingInfo},
    error::{AppError, AppResult},
    metrics::compute_cost,
    protocol::{ChatCompletionRequest, ChatCompletionResponse},
    providers::build_provider,
    proxy::{AccountingStream, StreamUsage},
    router::{ProviderType, RouteInfo, RouterState},
};

/// chat completions 完整业务流程入口。
/// `api` 层只做 HTTP 解包，所有业务逻辑在此函数中编排。
pub async fn handle_chat(
    state: RouterState,
    headers: HeaderMap,
    mut request: ChatCompletionRequest,
) -> AppResult<Response> {
    let start = Instant::now();

    // [临时调试] 打印 Authorization 前10位 和 model
    let auth_prefix = headers
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .map(|s| &s[..s.len().min(10)])
        .unwrap_or("(none)");
    tracing::info!("[DEBUG] auth_prefix={:?} model={} stream={}", auth_prefix, request.model, request.stream);

    // 过滤 tool/function 消息，避免 OpenAI 报 400
    request = request.strip_tool_messages();

    let meta = authenticate(&state, &headers).await?;

    if state.check_rate_limit(meta.api_key_id, meta.rate_limit_per_min).is_err() {
        return Err(AppError::RateLimited(
            "Rate limit exceeded. Please retry after a moment.".into(),
        ));
    }

    if request.model.is_empty() {
        return Err(AppError::BadRequest("model is required".into()));
    }
    if request.messages.is_empty() {
        return Err(AppError::BadRequest("messages cannot be empty".into()));
    }

    let pricing = db::get_model_pricing(&state.db, &request.model)
        .await?
        .ok_or_else(|| AppError::BadRequest(format!("model '{}' is not available", request.model)))?;

    let route = state.model_router.route(&request.model).await;
    info!(model = %request.model, provider = ?route.provider, stream = request.stream, "routing");

    // 余额预检：要求 balance >= estimated_cost，避免透支
    let max_tokens = request.max_tokens.unwrap_or(4096) as i32;
    let k = bigdecimal::BigDecimal::from(1000i32);
    let estimated_output = bigdecimal::BigDecimal::from(max_tokens) / &k * &pricing.output_price;
    let estimated_input  = bigdecimal::BigDecimal::from(500i32) / &k * &pricing.input_price;
    let estimated_cost   = estimated_input + estimated_output;
    let balance = db::get_user_balance(&state.db, meta.user_id).await?;
    if balance < estimated_cost {
        return Err(AppError::InsufficientBalance("余额不足，请充值".to_string()));
    }

    if request.stream {
        handle_stream(state, request, route, meta, pricing, start).await
    } else {
        handle_non_stream(state, request, route, meta, pricing, start).await
    }
}

// ─── 非流式 ───────────────────────────────────────────────────────────────────

pub(crate) async fn handle_non_stream(
    state: RouterState, request: ChatCompletionRequest, route: RouteInfo,
    meta: crate::db::ApiKeyMeta, _pricing: ModelPricingInfo, start: Instant,
) -> AppResult<Response> {
    let (resp, actual_model, actual_provider) = call_with_fallback(&state, &request, &route, false).await?;
    if !resp.status().is_success() {
        let status = resp.status();
        let body   = resp.text().await.unwrap_or_default();
        return Err(AppError::Upstream(format!("upstream {status}: {body}")));
    }

    let upstream_json: serde_json::Value = resp.json().await.map_err(AppError::HttpRequest)?;
    let provider  = build_provider(&route.provider, "", &route.provider_url);
    let chat_resp: ChatCompletionResponse = provider.convert_response(&request.model, &upstream_json);

    let mut latency_ms_header = String::new();
    let mut cost_yuan_header  = String::new();

    if let Some(ref usage) = chat_resp.usage {
        let pricing_actual = db::get_model_pricing(&state.db, &actual_model).await.ok().flatten()
            .unwrap_or(_pricing);
        let cost    = compute_cost(usage.prompt_tokens as i32, usage.completion_tokens as i32, &pricing_actual);
        let latency = start.elapsed().as_millis();

        latency_ms_header = latency.to_string();
        cost_yuan_header  = cost.to_string();

        let db_clone  = state.db.clone();
        let bill_args = BillArgs {
            user_id:         meta.user_id,
            api_key_id:      meta.api_key_id,
            model:           actual_model.clone(),
            requested_model: if actual_model != request.model { Some(request.model.clone()) } else { None },
            provider:        Some(actual_provider.as_str().to_string()),
            request_id:      None,
            input_tokens:    usage.prompt_tokens as i32,
            output_tokens:   usage.completion_tokens as i32,
            total_tokens:    usage.total_tokens as i32,
            cost,
            latency_ms:      latency as i32,
        };
        tokio::spawn(async move {
            if let Err(e) = db::bill_in_tx(&db_clone, bill_args).await {
                error!(err = %e, "non-stream billing failed");
            }
        });
    }

    // [临时调试] 打印返回给调用方的完整信息
    let body = serde_json::to_string(&chat_resp)?;
    {
        let content_preview = chat_resp.choices.first()
            .map(|c| {
                let t = c.message.content.chars().take(40).collect::<String>();
                format!("string({} chars): {:?}", c.message.content.len(), t)
            })
            .unwrap_or_else(|| "choices is empty!".into());
        let finish_reason = chat_resp.choices.first()
            .map(|c| c.finish_reason.as_str())
            .unwrap_or("N/A");
        let has_error = body.contains("\"error\"");
        info!(
            "[DEBUG RESP] status=200 \
             Content-Type=application/json \
             X-Model-Latency-Ms={} \
             X-Cost-Yuan={} \
             body_len={} \
             content={} \
             finish_reason={} \
             has_error_field={}",
            latency_ms_header, cost_yuan_header,
            body.len(), content_preview, finish_reason, has_error
        );
    }

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "application/json")
        .header("X-Model-Latency-Ms", latency_ms_header)
        .header("X-Cost-Yuan", cost_yuan_header)
        .body(Body::from(body))
        .unwrap())
}

// ─── 流式 ─────────────────────────────────────────────────────────────────────

pub(crate) async fn handle_stream(
    state: RouterState, request: ChatCompletionRequest, route: RouteInfo,
    meta: crate::db::ApiKeyMeta, _pricing: ModelPricingInfo, start: Instant,
) -> AppResult<Response> {
    let (upstream, actual_model, actual_provider) = call_with_fallback(&state, &request, &route, true).await?;
    if !upstream.status().is_success() {
        return Err(AppError::Upstream(format!("upstream stream error: {}", upstream.status())));
    }

    let pricing_actual = db::get_model_pricing(&state.db, &actual_model).await.ok().flatten()
        .unwrap_or(_pricing);

    let (usage_tx, usage_rx) = tokio::sync::oneshot::channel::<Option<StreamUsage>>();
    let raw_stream = upstream.bytes_stream().map(|r: Result<bytes::Bytes, reqwest::Error>| {
        r.map(|b| b.to_vec()).map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
    });
    let body_stream = Body::from_stream(AccountingStream::new(Box::pin(raw_stream), usage_tx));

    let db_clone   = state.db.clone();
    let model_name = actual_model.clone();
    let requested  = request.model.clone();
    let prov_str   = actual_provider.as_str().to_string();
    let user_id    = meta.user_id;
    let key_id     = meta.api_key_id;
    let pricing_for_bill = pricing_actual;

    tokio::spawn(async move {
        match usage_rx.await {
            Ok(Some(usage)) => {
                let cost = compute_cost(usage.prompt_tokens, usage.completion_tokens, &pricing_for_bill);
                if let Err(e) = db::bill_in_tx(&db_clone, BillArgs {
                    user_id,
                    api_key_id: key_id,
                    model: model_name.clone(),
                    requested_model: if model_name != requested { Some(requested.clone()) } else { None },
                    provider: Some(prov_str.clone()),
                    request_id: None,
                    input_tokens:  usage.prompt_tokens,
                    output_tokens: usage.completion_tokens,
                    total_tokens:  usage.prompt_tokens + usage.completion_tokens,
                    cost,
                    latency_ms: start.elapsed().as_millis() as i32,
                }).await {
                    error!(model = %model_name, err = %e, "stream billing failed");
                }
            }
            Ok(None) => warn!(model = %model_name, "stream ended without usage data"),
            Err(_)   => warn!(model = %model_name, "billing channel dropped"),
        }
    });

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", "text/event-stream")
        .header("Cache-Control", "no-cache")
        .header("X-Accel-Buffering", "no")
        .body(body_stream)
        .unwrap())
}

// ─── Provider 调用（含 Fallback）────────────────────────────────────────────

/// 调用 Provider，失败时自动切换到 fallback。
/// 返回 (响应, 实际调用的模型名, 实际调用的 Provider)。
pub(crate) async fn call_with_fallback(
    state: &RouterState,
    request: &ChatCompletionRequest,
    route: &RouteInfo,
    stream: bool,
) -> AppResult<(reqwest::Response, String, ProviderType)> {
    let api_key = state
        .config
        .api_key_for(&route.provider)
        .or_else(|| {
            if route.provider == ProviderType::Ollama { Some("") } else { None }
        })
        .ok_or_else(|| AppError::Internal(format!("{:?} API key not configured", route.provider)))?;
    let provider = build_provider(&route.provider, api_key, &route.provider_url);

    let result = provider.call(&state.http_client, request, stream).await;

    let needs_fallback = match &result {
        Ok(resp) if resp.status().is_success() => {
            return result.map(|r| (r, route.model.clone(), route.provider.clone()));
        }
        _ => has_fallback(route),
    };

    if needs_fallback {
        let fb_model   = route.fallback_model.as_deref().unwrap();
        let fb_url     = route.fallback_provider_url.as_deref().unwrap();
        let fb_ptype   = route.fallback_provider.as_ref().unwrap();
        let fb_api_key = state
            .config
            .api_key_for(fb_ptype)
            .or_else(|| if *fb_ptype == ProviderType::Ollama { Some("") } else { None })
            .ok_or_else(|| AppError::Internal(format!("{fb_ptype:?} fallback API key not configured")))?;

        warn!(primary = %route.model, fallback = %fb_model, "retrying with fallback");
        let mut fb_req = request.clone();
        fb_req.model = fb_model.to_string();
        let fb_resp = build_provider(fb_ptype, fb_api_key, fb_url)
            .call(&state.http_client, &fb_req, stream).await?;
        Ok((fb_resp, fb_model.to_string(), fb_ptype.clone()))
    } else {
        result.map(|r| (r, route.model.clone(), route.provider.clone()))
    }
}

fn has_fallback(route: &RouteInfo) -> bool {
    route.fallback_model.is_some()
        && route.fallback_provider_url.is_some()
        && route.fallback_provider.is_some()
}
