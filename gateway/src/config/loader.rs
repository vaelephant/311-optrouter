//! TOML 配置加载器
//!
//! 加载顺序：
//! 1. 读取 `config/base.toml`（必须存在）
//! 2. 读取 `config/{APP_ENV}.toml`（APP_ENV 默认 "dev"），不存在则跳过
//! 3. 将环境特定配置合并覆盖到 base（只覆盖非空字段）
//!
//! 结果存放在 `GatewayTomlConfig`，供 bootstrap 和 AppConfig 读取。
//! **API Key、DATABASE_URL 等秘密值仍从环境变量读取，不写入 TOML。**

use serde::Deserialize;

/// 完整网关配置（从 TOML 加载的非秘密部分）
#[derive(Debug, Clone, Deserialize, Default)]
pub struct GatewayTomlConfig {
    #[serde(default)]
    pub server:    ServerToml,
    #[serde(default)]
    pub postgres:  PostgresToml,
    #[serde(default)]
    pub redis:     RedisToml,
    #[serde(default)]
    pub providers: ProvidersToml,
    #[serde(default)]
    pub cache:     CacheToml,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ServerToml {
    #[serde(default = "default_port")]
    pub port: u16,
}
fn default_port() -> u16 { 3001 }

#[derive(Debug, Clone, Deserialize, Default)]
pub struct PostgresToml {
    #[serde(default = "default_pg_max_conn")]   pub max_connections:         u32,
    #[serde(default = "default_pg_min_conn")]   pub min_connections:         u32,
    #[serde(default = "default_pg_acq_to")]     pub acquire_timeout_secs:    u64,
    #[serde(default = "default_pg_max_life")]   pub max_lifetime_secs:       u64,
    #[serde(default = "default_pg_idle_to")]    pub idle_timeout_secs:       u64,
    #[serde(default = "default_pg_retry_n")]    pub connect_retry_attempts:  u32,
    #[serde(default = "default_pg_retry_wait")] pub connect_retry_wait_secs: u64,
}
fn default_pg_max_conn()   -> u32 { 20 }
fn default_pg_min_conn()   -> u32 { 1 }
fn default_pg_acq_to()     -> u64 { 30 }
fn default_pg_max_life()   -> u64 { 1800 }
fn default_pg_idle_to()    -> u64 { 300 }
fn default_pg_retry_n()    -> u32 { 3 }
fn default_pg_retry_wait() -> u64 { 3 }

#[derive(Debug, Clone, Deserialize, Default)]
pub struct RedisToml {
    #[serde(default = "default_redis_url")]
    pub url: String,
}
fn default_redis_url() -> String { "redis://127.0.0.1:6379".into() }

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ProvidersToml {
    #[serde(default = "default_prov_timeout")]  pub timeout_secs:  u64,
    #[serde(default = "default_prov_pool")]     pub pool_max_idle: usize,
    #[serde(default)] pub openai:    ProviderEndpoint,
    #[serde(default)] pub anthropic: ProviderEndpoint,
    #[serde(default)] pub google:    ProviderEndpoint,
    #[serde(default)] pub together:  ProviderEndpoint,
    #[serde(default)] pub ollama:    ProviderEndpoint,
}
fn default_prov_timeout() -> u64   { 120 }
fn default_prov_pool()    -> usize { 20 }

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ProviderEndpoint {
    #[serde(default)]
    pub base_url: String,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct CacheToml {
    #[serde(default = "default_key_ttl")]
    pub key_ttl_secs: u64,
}
fn default_key_ttl() -> u64 { 1800 }

// ─── 加载逻辑 ─────────────────────────────────────────────────────────────────

/// 从 TOML 文件加载配置。
///
/// 按 `config/base.toml` → `config/{APP_ENV}.toml` 顺序加载并合并。
/// 找不到文件时返回默认值（不 panic）。
pub fn load() -> GatewayTomlConfig {
    let base = load_file("config/base.toml");
    let env  = std::env::var("APP_ENV").unwrap_or_else(|_| "dev".into());
    let over = load_file(&format!("config/{env}.toml"));

    merge(base, over)
}

fn load_file(path: &str) -> Option<GatewayTomlConfig> {
    match std::fs::read_to_string(path) {
        Ok(s) => match toml::from_str::<GatewayTomlConfig>(&s) {
            Ok(cfg) => Some(cfg),
            Err(e) => {
                eprintln!("[config] parse error in {path}: {e}");
                None
            }
        },
        Err(_) => None,   // 文件不存在则跳过
    }
}

/// 将 `over` 的非默认字段覆盖到 `base`。
/// 简单做法：如果 `over` 存在则整体替换对应子段。
fn merge(base: Option<GatewayTomlConfig>, over: Option<GatewayTomlConfig>) -> GatewayTomlConfig {
    let mut cfg = base.unwrap_or_default();
    if let Some(o) = over {
        // 只覆盖 TOML 里显式出现的子段
        // serde 已经给每个子段设置了 Default，所以用"过覆盖 base"策略：
        // 若 override toml 里某字段存在则以它为准
        merge_postgres(&mut cfg.postgres, &o.postgres);
        merge_providers(&mut cfg.providers, &o.providers);
        if o.cache.key_ttl_secs != CacheToml::default().key_ttl_secs {
            cfg.cache.key_ttl_secs = o.cache.key_ttl_secs;
        }
        if o.server.port != ServerToml::default().port {
            cfg.server.port = o.server.port;
        }
        if o.redis.url != RedisToml::default().url {
            cfg.redis.url = o.redis.url;
        }
    }
    cfg
}

fn merge_postgres(base: &mut PostgresToml, o: &PostgresToml) {
    let d = PostgresToml::default();
    if o.max_connections         != d.max_connections         { base.max_connections         = o.max_connections; }
    if o.min_connections         != d.min_connections         { base.min_connections         = o.min_connections; }
    if o.acquire_timeout_secs    != d.acquire_timeout_secs    { base.acquire_timeout_secs    = o.acquire_timeout_secs; }
    if o.max_lifetime_secs       != d.max_lifetime_secs       { base.max_lifetime_secs       = o.max_lifetime_secs; }
    if o.idle_timeout_secs       != d.idle_timeout_secs       { base.idle_timeout_secs       = o.idle_timeout_secs; }
    if o.connect_retry_attempts  != d.connect_retry_attempts  { base.connect_retry_attempts  = o.connect_retry_attempts; }
    if o.connect_retry_wait_secs != d.connect_retry_wait_secs { base.connect_retry_wait_secs = o.connect_retry_wait_secs; }
}

fn merge_providers(base: &mut ProvidersToml, o: &ProvidersToml) {
    let d = ProvidersToml::default();
    if o.timeout_secs  != d.timeout_secs  { base.timeout_secs  = o.timeout_secs; }
    if o.pool_max_idle != d.pool_max_idle { base.pool_max_idle = o.pool_max_idle; }
    if !o.openai.base_url.is_empty()    { base.openai.base_url    = o.openai.base_url.clone(); }
    if !o.anthropic.base_url.is_empty() { base.anthropic.base_url = o.anthropic.base_url.clone(); }
    if !o.google.base_url.is_empty()    { base.google.base_url    = o.google.base_url.clone(); }
    if !o.together.base_url.is_empty()  { base.together.base_url  = o.together.base_url.clone(); }
    if !o.ollama.base_url.is_empty()    { base.ollama.base_url    = o.ollama.base_url.clone(); }
}
