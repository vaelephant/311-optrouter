//! 启动时自检：各上游 AI Provider 的联通情况（含 Key 认证）+ 本机 API 是否可访问。
//!
//! 检查策略：
//! - 对每个 Provider 发送带认证头的 `GET /models`（或等价端点）
//! - 区分"主机不可达"、"Key 无效（401/403）"、"OK"三种状态
//! - `GATEWAY_STARTUP_CHECK_EXIT_ON_FAIL=1` 时，任一非 OK 结果退出进程

use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use tracing::warn;

use crate::config::AppConfig;

const GREEN:  &str = "\x1b[1;92m";
const YELLOW: &str = "\x1b[1;93m";
const DIM:    &str = "\x1b[2;37m";
const RED:    &str = "\x1b[1;91m";
const RESET:  &str = "\x1b[0m";

/// 单条上游检查结果
#[derive(Debug, Clone)]
pub struct UpstreamResult {
    pub name:   String,
    pub status: CheckStatus,
}

/// 供 GET /health/models 使用：按 provider 小写 key 返回状态与响应时间
#[derive(Debug, Clone)]
pub struct ProviderProbeResult {
    pub provider:   String,
    pub status:     CheckStatus,
    pub latency_ms: u64,
}

/// 检查状态：区分"未配置 Key"、"OK"、"Key 无效"、"不可达"
#[derive(Debug, Clone)]
pub enum CheckStatus {
    /// Key 未配置，跳过检查
    NoKey,
    /// 联通 + Key 有效
    Ok,
    /// 主机可达但返回 401 / 403
    AuthFailed(u16),
    /// 网络超时或连接失败
    Unreachable(String),
}

impl CheckStatus {
    pub fn is_ok(&self) -> bool {
        matches!(self, CheckStatus::Ok)
    }
}

const CHECK_TIMEOUT_SECS: u64 = 8;
const API_CHECK_RETRIES: u32 = 5;
const API_CHECK_INTERVAL_SECS: u64 = 1;
const API_CHECK_TIMEOUT_SECS: u64 = 2;

/// 构建带代理配置的 HTTP client（读取 PROXY_ENABLED / PROXY_URL 环境变量）
fn build_probe_client(timeout_secs: u64) -> reqwest::Client {
    let proxy_enabled = std::env::var("PROXY_ENABLED")
        .map(|v| v.to_lowercase() == "true")
        .unwrap_or(false);
    let proxy_url = std::env::var("PROXY_URL").ok();

    let mut builder = reqwest::Client::builder()
        .timeout(Duration::from_secs(timeout_secs));

    if proxy_enabled {
        if let Some(url) = &proxy_url {
            match reqwest::Proxy::all(url) {
                Ok(proxy) => { builder = builder.proxy(proxy); }
                Err(e) => {
                    tracing::warn!("healthcheck: Invalid PROXY_URL '{}': {}", url, e);
                }
            }
        }
    }

    builder.build().unwrap_or_else(|e| {
        tracing::error!("Failed to build HTTP client for probe: {e}");
        std::process::exit(1);
    })
}

/// 检查各上游 Provider 的联通 + Key 认证状态。
pub async fn check_upstreams(config: Arc<AppConfig>) -> Vec<UpstreamResult> {
    let client = build_probe_client(CHECK_TIMEOUT_SECS);

    let p = &config.providers;

    // (名称, 模型列表端点, 认证方式)
    let checks: Vec<(&str, CheckAuth)> = vec![
        ("OpenAI",    CheckAuth::bearer(
            &format!("{}/models", p.openai_base_url.trim_end_matches('/')),
            p.openai_api_key.as_deref(),
        )),
        ("Anthropic", CheckAuth::anthropic(
            &format!("{}/v1/models", p.anthropic_base_url.trim_end_matches('/')),
            p.anthropic_api_key.as_deref(),
        )),
        ("Google",    CheckAuth::google_key(
            &format!("{}/models", p.google_base_url.trim_end_matches('/')),
            p.google_api_key.as_deref(),
        )),
        ("Together",  CheckAuth::bearer(
            &format!("{}/models", p.together_base_url.trim_end_matches('/')),
            p.together_api_key.as_deref(),
        )),
        ("Ollama",    CheckAuth::no_auth(
            &format!("{}/models", p.ollama_base_url.trim_end_matches('/')),
        )),
    ];

    let mut results = Vec::with_capacity(checks.len());
    let mut any_fail = false;

    for (name, auth) in checks {
        let status = probe(&client, &auth).await;
        if !status.is_ok() && !matches!(status, CheckStatus::NoKey) {
            warn!(provider = name, status = ?status, "provider check failed");
            any_fail = true;
        }
        results.push(UpstreamResult { name: name.to_string(), status });
    }

    let exit_on_fail = std::env::var("GATEWAY_STARTUP_CHECK_EXIT_ON_FAIL")
        .ok()
        .map(|v| matches!(v.as_str(), "1" | "true" | "yes"))
        .unwrap_or(false);

    if any_fail && exit_on_fail {
        tracing::error!("Startup check failed (GATEWAY_STARTUP_CHECK_EXIT_ON_FAIL=1), exiting");
        std::process::exit(1);
    }

    results
}

/// 对当前配置的各 Provider 做一次联通探测并返回状态与响应时间。
/// provider 字段为小写（openai / anthropic / google / together / ollama），便于与 model_router 结果对应。
pub async fn probe_all_providers_for_api(config: std::sync::Arc<AppConfig>) -> Vec<ProviderProbeResult> {
    const TIMEOUT_SECS: u64 = 6;
    let client = build_probe_client(TIMEOUT_SECS);
    let p = &config.providers;
    let checks: Vec<(&str, CheckAuth)> = vec![
        (
            "openai",
            CheckAuth::bearer(
                &format!("{}/models", p.openai_base_url.trim_end_matches('/')),
                p.openai_api_key.as_deref(),
            ),
        ),
        (
            "anthropic",
            CheckAuth::anthropic(
                &format!("{}/v1/models", p.anthropic_base_url.trim_end_matches('/')),
                p.anthropic_api_key.as_deref(),
            ),
        ),
        (
            "google",
            CheckAuth::google_key(
                &format!("{}/models", p.google_base_url.trim_end_matches('/')),
                p.google_api_key.as_deref(),
            ),
        ),
        (
            "together",
            CheckAuth::bearer(
                &format!("{}/models", p.together_base_url.trim_end_matches('/')),
                p.together_api_key.as_deref(),
            ),
        ),
        (
            "ollama",
            CheckAuth::no_auth(&format!(
                "{}/models",
                p.ollama_base_url.trim_end_matches('/')
            )),
        ),
    ];
    let mut results = Vec::with_capacity(checks.len());
    for (key, auth) in checks {
        let (status, latency_ms) = probe_with_latency(&client, &auth).await;
        results.push(ProviderProbeResult {
            provider:   key.to_string(),
            status,
            latency_ms,
        });
    }
    results
}

// ─── 认证方式封装 ──────────────────────────────────────────────────────────────

#[derive(Debug)]
enum AuthKind {
    NoAuth,
    Bearer,
    AnthropicKey,
    GoogleQueryKey,
}

struct CheckAuth {
    url:      String,
    api_key:  Option<String>,
    kind:     AuthKind,
}

impl CheckAuth {
    fn bearer(url: &str, key: Option<&str>) -> Self {
        Self { url: url.to_string(), api_key: key.map(String::from), kind: AuthKind::Bearer }
    }
    fn anthropic(url: &str, key: Option<&str>) -> Self {
        Self { url: url.to_string(), api_key: key.map(String::from), kind: AuthKind::AnthropicKey }
    }
    fn google_key(url: &str, key: Option<&str>) -> Self {
        Self { url: url.to_string(), api_key: key.map(String::from), kind: AuthKind::GoogleQueryKey }
    }
    fn no_auth(url: &str) -> Self {
        Self { url: url.to_string(), api_key: None, kind: AuthKind::NoAuth }
    }
}

async fn probe(client: &reqwest::Client, auth: &CheckAuth) -> CheckStatus {
    let (status, _) = probe_with_latency(client, auth).await;
    status
}

/// 同 probe，并返回本次请求的耗时（毫秒）。供 API 使用。
async fn probe_with_latency(client: &reqwest::Client, auth: &CheckAuth) -> (CheckStatus, u64) {
    if !matches!(auth.kind, AuthKind::NoAuth) && auth.api_key.is_none() {
        return (CheckStatus::NoKey, 0);
    }
    let key = auth.api_key.as_deref().unwrap_or("");
    let req = match auth.kind {
        AuthKind::NoAuth => client.get(&auth.url),
        AuthKind::Bearer => {
            client.get(&auth.url).header("Authorization", format!("Bearer {key}"))
        }
        AuthKind::AnthropicKey => {
            client
                .get(&auth.url)
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
        }
        AuthKind::GoogleQueryKey => client.get(format!("{}?key={}", auth.url, key)),
    };
    let start = std::time::Instant::now();
    let result = req.send().await;
    let latency_ms = start.elapsed().as_millis() as u64;
    let status = match result {
        Ok(resp) => {
            let code = resp.status().as_u16();
            match code {
                200..=299 => CheckStatus::Ok,
                401 | 403 => CheckStatus::AuthFailed(code),
                _ => CheckStatus::Ok,
            }
        }
        Err(e) => CheckStatus::Unreachable(if e.is_timeout() {
            "timeout".to_string()
        } else {
            e.to_string()
        }),
    };
    (status, latency_ms)
}

/// 服务已监听后，对本机 GET /health 做联通检查（带重试）。
pub async fn check_api_reachable(port: u16) -> bool {
    let url = format!("http://127.0.0.1:{port}/health");
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(API_CHECK_TIMEOUT_SECS))
        .build()
        .unwrap_or_else(|e| {
            tracing::error!("Failed to build HTTP client for API check: {e}");
            std::process::exit(1);
        });

    for attempt in 1..=API_CHECK_RETRIES {
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => return true,
            Ok(resp) => {
                warn!(url = %url, status = %resp.status(), attempt, "API returned non-OK");
            }
            Err(e) => {
                warn!(url = %url, error = %e, attempt, "API unreachable");
            }
        }
        if attempt < API_CHECK_RETRIES {
            tokio::time::sleep(Duration::from_secs(API_CHECK_INTERVAL_SECS)).await;
        }
    }

    tracing::error!(url = %url, "API self-check failed after {} attempts", API_CHECK_RETRIES);
    std::process::exit(1);
}

/// 服务就绪后打印彩色启动摘要框。
///
/// `models_by_provider` — 由 `ModelRouter::models_by_provider()` 返回的
/// `(provider_name, [model_id])` 列表，用于在摘要中按 Provider 展示模型。
pub fn print_startup_summary(
    listen_addr: SocketAddr,
    model_count: usize,
    registry_path: &str,
    upstream_results: &[UpstreamResult],
    models_by_provider: &[(String, Vec<String>)],
    api_ok: bool,
) {
    // provider 小写名称 → UpstreamResult
    let upstream_map: std::collections::HashMap<String, &UpstreamResult> = upstream_results
        .iter()
        .map(|r| (r.name.to_lowercase(), r))
        .collect();

    let sep = format!("{DIM}├─────────────────────────────────────────────────────────────{RESET}");

    eprintln!("{DIM}┌─────────────────────────────────────────────────────────────{RESET}");
    eprintln!("{DIM}│{RESET} {GREEN}OptRouter Gateway{RESET}");
    eprintln!("{sep}");
    eprintln!("{DIM}│{RESET}  Postgres     {GREEN}✓{RESET} connected");
    eprintln!("{DIM}│{RESET}  Redis        {GREEN}✓{RESET} connected");
    eprintln!("{DIM}│{RESET}  Models       {GREEN}{model_count}{RESET} loaded  {DIM}({registry_path}){RESET}");
    eprintln!("{sep}");
    eprintln!("{DIM}│{RESET}  Providers");

    for (provider, models) in models_by_provider {
        let count = models.len();

        // provider 首字母大写
        let display_name = {
            let mut chars = provider.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().to_string() + chars.as_str(),
            }
        };

        let (icon, note) = match upstream_map.get(provider.as_str()) {
            Some(r) => match &r.status {
                CheckStatus::Ok              => (format!("{GREEN}✓{RESET}"), String::new()),
                CheckStatus::AuthFailed(code)=> (format!("{YELLOW}⚠{RESET}"), format!("  {YELLOW}key invalid ({code}){RESET}")),
                CheckStatus::Unreachable(msg)=> (format!("{RED}✗{RESET}"),   format!("  {DIM}{msg}{RESET}")),
                CheckStatus::NoKey           => (format!("{DIM}–{RESET}"),   format!("  {DIM}no key configured{RESET}")),
            },
            None => (format!("{DIM}–{RESET}"), String::new()),
        };

        eprintln!(
            "{DIM}│{RESET}    {icon}  {GREEN}{display_name:<10}{RESET}  {DIM}{count} model{}{RESET}{note}",
            if count == 1 { "" } else { "s" }
        );

        const MODELS_PER_LINE: usize = 5;
        for chunk in models.chunks(MODELS_PER_LINE) {
            eprintln!("{DIM}│{RESET}         {DIM}{}{RESET}", chunk.join("  ·  "));
        }
    }

    eprintln!("{sep}");
    eprintln!("{DIM}│{RESET}  Listen       {GREEN}✓{RESET}  http://{listen_addr}");
    eprintln!(
        "{DIM}│{RESET}  API          {}",
        if api_ok { format!("{GREEN}✓{RESET}  reachable") }
        else      { format!("{RED}✗{RESET}  unreachable") }
    );
    eprintln!("{DIM}└─────────────────────────────────────────────────────────────{RESET}");
    eprintln!();
    eprintln!("{GREEN}✓ Gateway is ready.{RESET}  Press Ctrl-C to stop.");
    eprintln!();
}

