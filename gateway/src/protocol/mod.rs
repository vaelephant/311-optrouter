//! 对外 API 协议层
//!
//! 定义网关暴露给用户的 HTTP 接口格式，与数据库实体完全隔离。
//!
//! 目前只有一套协议：OpenAI 兼容格式（`openai`）。
//! 后续如需支持其他协议格式（如自定义 v2 API），在此目录下新增文件即可。

pub mod openai;

// 把常用类型提升到 protocol:: 命名空间，方便使用
pub use openai::{
    ChatChoice, ChatCompletionRequest, ChatCompletionResponse,
    ChatMessage, MessageRole, ModelInfo, ModelListResponse,
    ModelPricingResponse, Usage, UsageStatsResponse,
};
