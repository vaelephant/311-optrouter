//! 启动模块：基础设施连接 + 上游自检 + 启动摘要。

pub mod bootstrap;
pub mod healthcheck;

pub use healthcheck::{check_api_reachable, check_upstreams, print_startup_summary, CheckStatus, UpstreamResult};
