//! Provider 连接配置
//!
//! 每个 AI Provider 的：
//! - 平台 API Key（从环境变量读取）
//! - 默认 Base URL（可被路由表覆盖）
//! - 超时、连接池大小等

/// 所有 AI Provider 的连接配置
#[allow(dead_code)]
pub struct ProviderConfig {
    // ── OpenAI ──────────────────────────────────────────────────────────────
    /// 平台账号 API Key（env: OPENAI_API_KEY）
    pub openai_api_key:  Option<String>,
    /// Base URL，支持替换为兼容接口（Together / Groq 等）
    pub openai_base_url: String,

    // ── Anthropic ────────────────────────────────────────────────────────────
    /// 平台账号 API Key（env: ANTHROPIC_API_KEY）
    pub anthropic_api_key:  Option<String>,
    pub anthropic_base_url: String,

    // ── Google Gemini ────────────────────────────────────────────────────────
    /// 平台账号 API Key（env: GOOGLE_API_KEY）
    pub google_api_key:  Option<String>,
    pub google_base_url: String,

    // ── Together AI（OpenAI 兼容）────────────────────────────────────────────
    pub together_api_key:  Option<String>,
    pub together_base_url: String,

    // ── Ollama（OpenAI 兼容，本地通常无需 Key）────────────────────────────────
    pub ollama_api_key:  Option<String>,
    pub ollama_base_url: String,

    // ── 网络参数 ─────────────────────────────────────────────────────────────
    /// 上游请求超时（秒），默认 120s（大模型生成慢）
    pub timeout_secs: u64,
    /// 每个 host 保留的最大空闲连接数（reqwest 连接池）
    pub pool_max_idle: usize,
}

impl ProviderConfig {
    /// 从环境变量加载，缺失的 Key 留 None（路由时按需报错）。
    /// Base URL 优先级：环境变量 > TOML > 内置默认值。
    pub fn from_env() -> Self {
        Self::from_env_with_toml(None)
    }

    /// 同 `from_env`，但以 TOML 配置作为默认值来源（环境变量仍可覆盖）。
    pub fn from_env_with_toml(toml: Option<&super::loader::ProvidersToml>) -> Self {
        let t_url = |toml_url: Option<&str>, fallback: &str| -> String {
            std::env::var(
                // 无对应 env var 时用 TOML，再用内置默认
                "___NEVER___"   // 占位，env 这层在下方各字段单独处理
            ).unwrap_or_else(|_| {
                toml_url.filter(|s| !s.is_empty())
                    .unwrap_or(fallback)
                    .to_string()
            })
        };
        let _ = t_url;  // 上面是示意，下面逐字段处理更清晰

        let openai_base = std::env::var("OPENAI_BASE_URL").unwrap_or_else(|_| {
            toml.map(|t| t.openai.base_url.as_str()).filter(|s| !s.is_empty())
                .unwrap_or("https://api.openai.com/v1").into()
        });
        let anthropic_base = std::env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| {
            toml.map(|t| t.anthropic.base_url.as_str()).filter(|s| !s.is_empty())
                .unwrap_or("https://api.anthropic.com").into()
        });
        let google_base = std::env::var("GOOGLE_BASE_URL").unwrap_or_else(|_| {
            toml.map(|t| t.google.base_url.as_str()).filter(|s| !s.is_empty())
                .unwrap_or("https://generativelanguage.googleapis.com/v1beta").into()
        });
        let together_base = std::env::var("TOGETHER_BASE_URL").unwrap_or_else(|_| {
            toml.map(|t| t.together.base_url.as_str()).filter(|s| !s.is_empty())
                .unwrap_or("https://api.together.xyz/v1").into()
        });
        let ollama_base = std::env::var("OLLAMA_BASE_URL").unwrap_or_else(|_| {
            toml.map(|t| t.ollama.base_url.as_str()).filter(|s| !s.is_empty())
                .unwrap_or("http://localhost:11434/v1").into()
        });

        let timeout = std::env::var("PROVIDER_TIMEOUT_SECS")
            .ok().and_then(|v| v.parse().ok())
            .unwrap_or_else(|| toml.map(|t| t.timeout_secs).unwrap_or(120));
        let pool_max_idle = std::env::var("PROVIDER_POOL_MAX_IDLE")
            .ok().and_then(|v| v.parse().ok())
            .unwrap_or_else(|| toml.map(|t| t.pool_max_idle).unwrap_or(20));

        Self {
            openai_api_key:   std::env::var("OPENAI_API_KEY").ok(),
            openai_base_url:  openai_base,
            anthropic_api_key:   std::env::var("ANTHROPIC_API_KEY").ok(),
            anthropic_base_url:  anthropic_base,
            google_api_key:   std::env::var("GOOGLE_API_KEY").ok(),
            google_base_url:  google_base,
            together_api_key: std::env::var("TOGETHER_API_KEY").ok(),
            together_base_url: together_base,
            ollama_api_key: std::env::var("OLLAMA_API_KEY").ok(),
            ollama_base_url: ollama_base,
            timeout_secs:  timeout,
            pool_max_idle,
        }
    }
}
