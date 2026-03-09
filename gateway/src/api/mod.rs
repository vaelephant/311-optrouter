//! HTTP API 路由处理器
//!
//! 每个文件对应一组接口，只做流程编排，不含业务实现细节。

pub mod chat;
pub mod health;
pub mod health_models;
pub mod models;
pub mod usage;
pub mod admin;
