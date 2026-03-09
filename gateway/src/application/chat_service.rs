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
    db::{self, BillArgs, ModelPricingInfo, get_session_summary, set_session_summary},
    error::{AppError, AppResult},
    metrics::{compute_cost, token_counter::compute_savings},
    protocol::{ChatCompletionRequest, ChatCompletionResponse, ChatMessage, MessageRole},
    providers::build_provider,
    proxy::{AccountingStream, StreamUsage},
    router::{ProviderType, RouteInfo, RouterState, RequestProfile, IntelligentRouteResult, RoutingDecision, ModelTier},
};

/// chat completions 完整业务流程入口。
/// `api` 层只做 HTTP 解包，所有业务逻辑在此函数中编排。
pub async fn handle_chat(
    state: RouterState,
    headers: HeaderMap,
    mut request: ChatCompletionRequest,
) -> AppResult<Response> {
    let start = Instant::now();

    // 1. 提取路由开关信号
    let session_id = headers.get("x-session-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| uuid::Uuid::parse_str(s).ok());
    
    // 智能分层开关：携带特定 Header 或 请求的是虚拟模型
    let is_virtual_model = matches!(request.model.as_str(), "auto" | "eco" | "balanced" | "premium" | "code" | "reasoning");
    let has_intelligent_header = headers.get("x-opt-strategy")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_lowercase() == "intelligent")
        .unwrap_or(false);
    
    let routing_enabled = is_virtual_model || has_intelligent_header;

    // [临时调试] 打印开关状态
    tracing::info!("[DEBUG] model={} routing_enabled={} session={:?}", request.model, routing_enabled, session_id);

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

    // 2. 路由决策逻辑
    let (route, decision) = if routing_enabled {
        // --- 开启分层路由 (Layer 1, 2 & 3) ---
        let mut summary = None;
        if let Some(sid) = session_id {
            let mut redis = state.redis.clone();
            summary = get_session_summary(&mut redis, sid).await;
        }

        let last_msg_content = request.messages.last().map(|m| m.content.as_str()).unwrap_or("");
        let profile = RequestProfile::from_request(&request);
        let route_result = state.model_router.intelligent_route(&profile, summary.as_ref(), last_msg_content, true).await;
        
        match route_result {
            IntelligentRouteResult::Routed(r, d) => {
                info!(requested = %request.model, routed_to = %r.model, tier = ?d.tier, confidence = d.confidence, "layer 1/2 routing success");
                (r, Some(d))
            }
            IntelligentRouteResult::NeedsRefinement(classifier_model, prompt) => {
                info!(classifier = %classifier_model, "triggering layer 3 refinement");
                let classifier_route = state.model_router.route(&classifier_model).await;
                let refine_req = ChatCompletionRequest {
                    model: classifier_model.clone(),
                    messages: vec![ChatMessage {
                        role: MessageRole::User,
                        content: prompt,
                        ..Default::default()
                    }],
                    max_tokens: Some(10),
                    temperature: Some(0.0),
                    ..Default::default()
                };
                let refine_result = tokio::time::timeout(
                    std::time::Duration::from_secs(2), 
                    call_with_fallback(&state, &refine_req, &classifier_route, false)
                ).await;

                match refine_result {
                    Ok(Ok((resp, _, _))) => {
                        if let Ok(refine_json) = resp.json::<serde_json::Value>().await {
                            let provider = build_provider(&classifier_route.provider, "", &classifier_route.provider_url);
                            let refine_chat_resp: ChatCompletionResponse = provider.convert_response(&classifier_model, &refine_json);
                            let text = refine_chat_resp.choices.first().map(|c| c.message.content.as_str()).unwrap_or("balanced");
                            let tier = state.model_router.parse_refined_tier(text);
                            let final_route = state.model_router.route_by_tier(tier).await.unwrap_or(classifier_route.clone());
                            
                            info!(tier = ?tier, routed_to = %final_route.model, "layer 3 refinement result");
                            (final_route, Some(RoutingDecision {
                                target_model: String::new(),
                                tier,
                                confidence: 1.0,
                                reason: vec![format!("Layer 3 refined from classifier: {}", text)],
                                fallback_models: vec![],
                            }))
                        } else {
                            (classifier_route, None)
                        }
                    }
                    _ => {
                        warn!("layer 3 refinement failed or timed out, falling back to static");
                        (state.model_router.route(&request.model).await, None)
                    }
                }
            }
            IntelligentRouteResult::Static(_) => {
                (state.model_router.route(&request.model).await, None)
            }
        }
    } else {
        // --- 关闭分层路由: 100% 静态透传 ---
        (state.model_router.route(&request.model).await, None)
    };

    let pricing = db::get_model_pricing(&state.db, &route.model)
        .await?
        .ok_or_else(|| AppError::BadRequest(format!("model '{}' is not available", route.model)))?;

    // 余额预检
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
        handle_stream(state, request, route, meta, pricing, start, session_id, decision).await
    } else {
        handle_non_stream(state, request, route, meta, pricing, start, session_id, decision).await
    }
}

// ─── 非流式 ───────────────────────────────────────────────────────────────────

pub(crate) async fn handle_non_stream(
    state: RouterState, request: ChatCompletionRequest, route: RouteInfo,
    meta: crate::db::ApiKeyMeta, _pricing: ModelPricingInfo, start: Instant,
    session_id: Option<uuid::Uuid>,
    decision: Option<RoutingDecision>,
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

    if let Some(usage) = chat_resp.usage.clone() {
        let pricing_actual = db::get_model_pricing(&state.db, &actual_model).await.ok().flatten()
            .unwrap_or(_pricing);
        let cost    = compute_cost(usage.prompt_tokens as i32, usage.completion_tokens as i32, &pricing_actual);
        let latency = start.elapsed().as_millis();

        latency_ms_header = latency.to_string();
        cost_yuan_header  = cost.to_string();

        let db_clone  = state.db.clone();
        let redis_clone = state.redis.clone();
        
        let messages = request.messages.clone();
        let tier = decision.as_ref().map(|d| d.tier).unwrap_or(route.tier);
        let requested_model = request.model.clone();
        let routing_was_active = decision.is_some();

        tokio::spawn(async move {
            // 只有在路由激活且实际模型与请求模型不同时，才计算节省金额
            let saved_cost = if routing_was_active {
                let baseline_model = match tier {
                    ModelTier::Premium | ModelTier::Reasoning | ModelTier::LongCtx => "gpt-4o",
                    _ => "gpt-4o-mini",
                };
                let baseline_pricing = db::get_model_pricing(&db_clone, baseline_model).await.ok().flatten()
                    .unwrap_or(pricing_actual.clone());
                compute_savings(usage.prompt_tokens as i32, usage.completion_tokens as i32, &cost, tier, &baseline_pricing)
            } else {
                bigdecimal::BigDecimal::from(0)
            };

            let bill_args = BillArgs {
                user_id:         meta.user_id,
                api_key_id:      meta.api_key_id,
                model:           actual_model.clone(),
                requested_model: if actual_model != requested_model { Some(requested_model) } else { None },
                provider:        Some(actual_provider.as_str().to_string()),
                request_id:      None,
                input_tokens:    usage.prompt_tokens as i32,
                output_tokens:   usage.completion_tokens as i32,
                total_tokens:    usage.total_tokens as i32,
                cost,
                saved_cost,
                latency_ms:      latency as i32,
            };

            if let Err(e) = db::bill_in_tx(&db_clone, bill_args).await {
                error!(err = %e, "non-stream billing failed");
            }
            if let Some(sid) = session_id {
                spawn_smart_summary_update(state, sid, messages, redis_clone).await;
            }
        });
    }

    let body = serde_json::to_string(&chat_resp)?;
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
    session_id: Option<uuid::Uuid>,
    decision: Option<RoutingDecision>,
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
    let redis_clone = state.redis.clone();
    let model_name = actual_model.clone();
    let requested  = request.model.clone();
    let prov_str   = actual_provider.as_str().to_string();
    let user_id    = meta.user_id;
    let key_id     = meta.api_key_id;
    let pricing_for_bill = pricing_actual;
    let messages = request.messages.clone();
    let tier = decision.as_ref().map(|d| d.tier).unwrap_or(route.tier);
    let routing_was_active = decision.is_some();

    tokio::spawn(async move {
        match usage_rx.await {
            Ok(Some(usage)) => {
                let actual_cost = compute_cost(usage.prompt_tokens, usage.completion_tokens, &pricing_for_bill);
                
                let saved_cost = if routing_was_active {
                    let baseline_model = match tier {
                        ModelTier::Premium | ModelTier::Reasoning | ModelTier::LongCtx => "gpt-4o",
                        _ => "gpt-4o-mini",
                    };
                    let baseline_pricing = db::get_model_pricing(&db_clone, baseline_model).await.ok().flatten()
                        .unwrap_or(pricing_for_bill.clone());
                    compute_savings(usage.prompt_tokens, usage.completion_tokens, &actual_cost, tier, &baseline_pricing)
                } else {
                    bigdecimal::BigDecimal::from(0)
                };

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
                    cost: actual_cost,
                    saved_cost,
                    latency_ms: start.elapsed().as_millis() as i32,
                }).await {
                    error!(model = %model_name, err = %e, "stream billing failed");
                }
                
                if let Some(sid) = session_id {
                    spawn_smart_summary_update(state, sid, messages, redis_clone).await;
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

// ─── 智能摘要更新辅助函数 ─────────────────────────────────────────────────────

async fn spawn_smart_summary_update(
    state: RouterState,
    session_id: uuid::Uuid,
    messages: Vec<ChatMessage>,
    mut redis: redis::aio::ConnectionManager,
) {
    let summary_model = state.model_router.summary_model.clone();
    let summary_route = state.model_router.route(&summary_model).await;
    let msgs_json = serde_json::to_string(&messages).unwrap_or_default();
    let summary_prompt = state.model_router.build_summary_prompt(&msgs_json);
    
    let summary_req = ChatCompletionRequest {
        model: summary_model.clone(),
        messages: vec![ChatMessage {
            role: MessageRole::User,
            content: summary_prompt,
            ..Default::default()
        }],
        max_tokens: Some(200),
        temperature: Some(0.3),
        ..Default::default()
    };

    let update_result = tokio::time::timeout(
        std::time::Duration::from_secs(5),
        call_with_fallback(&state, &summary_req, &summary_route, false)
    ).await;

    match update_result {
        Ok(Ok((resp, _, _))) => {
            if let Ok(json) = resp.json::<serde_json::Value>().await {
                let provider = build_provider(&summary_route.provider, "", &summary_route.provider_url);
                let summary_resp: ChatCompletionResponse = provider.convert_response(&summary_model, &json);
                let text = summary_resp.choices.first().map(|c| c.message.content.as_str()).unwrap_or("");
                if let Some(new_summary) = state.model_router.parse_summary_response(text, session_id) {
                    set_session_summary(&mut redis, &new_summary).await;
                    info!(session = %session_id, topic = %new_summary.topic, "smart summary updated");
                }
            }
        }
        _ => warn!(session = %session_id, "smart summary update failed or timed out"),
    }
}

// ─── Provider 调用（含 Fallback）────────────────────────────────────────────

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
