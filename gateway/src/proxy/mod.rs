//! 代理层
//!
//! 负责 AI Provider 响应到客户端的字节流转发，
//! 以及在透传过程中截取 token 用量。

pub mod stream_proxy;

pub use stream_proxy::{AccountingStream, StreamUsage};
