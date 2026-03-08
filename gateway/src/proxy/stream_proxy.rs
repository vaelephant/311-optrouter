//! SSE 流代理 + 计费截取
//!
//! 核心类型：[`AccountingStream`]
//!
//! # 工作原理
//!
//! ```text
//! 上游 AI Provider (reqwest bytes stream)
//!        ↓
//! AccountingStream
//!   ├── 透明透传字节 → 用户（不修改任何内容）
//!   └── 解析 SSE 行 → 寻找 usage 字段
//!        ↓ 流结束时
//! oneshot channel → 异步扣费任务
//! ```
//!
//! # OpenAI 流式 usage 获取
//!
//! 需要在请求中加 `stream_options: {"include_usage": true}`，
//! 则 OpenAI 会在 `data: [DONE]` 前多推一个 chunk：
//! ```text
//! data: {"id":"...","choices":[],"usage":{"prompt_tokens":10,"completion_tokens":20,"total_tokens":30}}
//! data: [DONE]
//! ```
//! [`AccountingStream`] 会截取这个 chunk 中的 usage 数据。
//!
//! # 仅输出正文（?format=text）
//! [`TextOnlyStream`] 解析 SSE 只输出 `choices[0].delta.content`，响应为纯文本流；计费逻辑与 AccountingStream 相同。

use std::collections::VecDeque;
use std::pin::Pin;
use std::task::{Context, Poll};

use futures::Stream;
use serde_json::Value;

// ─── 数据结构 ─────────────────────────────────────────────────────────────────

/// 从 SSE 流中提取到的 token 用量（用于流结束后的扣费）
#[derive(Debug, Clone)]
pub struct StreamUsage {
    pub prompt_tokens:     i32,
    pub completion_tokens: i32,
}

// ─── AccountingStream ─────────────────────────────────────────────────────────
// 保留供日后需要「透传原始 SSE」时使用（如 ?format=sse）

#[allow(dead_code)]
/// 对 SSE 字节流进行透明代理，同时截取 usage 数据。
///
/// ## 职责
/// 1. **透传**：所有字节原样传给下游，不做任何修改
/// 2. **截取**：解析经过的每个 SSE 数据行，寻找 `usage` 字段
/// 3. **通知**：流结束时通过 oneshot channel 发送 usage（有则发值，无则发 None）
///
/// ## 为什么不能在流式响应结束后再单独请求 usage？
/// 因为 SSE 是单向推送，流结束后连接就断了。
/// 必须在流传输过程中实时截取，或等到 [DONE] 信号后从已截取的数据中提取。
pub struct AccountingStream {
    /// 原始字节流（来自 reqwest）
    inner:    Pin<Box<dyn Stream<Item = Result<Vec<u8>, std::io::Error>> + Send>>,
    /// 流结束时发送 usage 的 channel（take() 后置为 None，防止重复发送）
    usage_tx: Option<tokio::sync::oneshot::Sender<Option<StreamUsage>>>,
    /// 当前已解析到的最新 usage（流结束时取走）
    usage:    Option<StreamUsage>,
}

#[allow(dead_code)]
impl AccountingStream {
    pub fn new(
        inner:    Pin<Box<dyn Stream<Item = Result<Vec<u8>, std::io::Error>> + Send>>,
        usage_tx: tokio::sync::oneshot::Sender<Option<StreamUsage>>,
    ) -> Self {
        Self {
            inner,
            usage_tx: Some(usage_tx),
            usage:    None,
        }
    }

    /// 尝试从一段 SSE 字节中解析 usage 数据。
    ///
    /// SSE 行格式：`data: <json_string>\n`
    /// 我们只关心包含 `usage` 字段的行。
    fn try_extract_usage(&mut self, chunk: &[u8]) {
        let text = String::from_utf8_lossy(chunk);
        for line in text.lines() {
            if !line.starts_with("data: ") || line == "data: [DONE]" {
                continue;
            }
            let json_str = &line[6..]; // 跳过 "data: " 前缀
            if let Ok(v) = serde_json::from_str::<Value>(json_str) {
                if let Some(usage) = v.get("usage") {
                    let pt = usage
                        .get("prompt_tokens")
                        .and_then(|x| x.as_i64())
                        .unwrap_or(0) as i32;
                    let ct = usage
                        .get("completion_tokens")
                        .and_then(|x| x.as_i64())
                        .unwrap_or(0) as i32;
                    // 只有真正有有效数据时才记录（避免被 0,0 的空 usage chunk 覆盖已有数据）
                    if pt > 0 || ct > 0 {
                        self.usage = Some(StreamUsage {
                            prompt_tokens:     pt,
                            completion_tokens: ct,
                        });
                    }
                }
            }
        }
    }
}

// ─── Stream Trait 实现 ────────────────────────────────────────────────────────

#[allow(dead_code)]
impl Stream for AccountingStream {
    type Item = Result<Vec<u8>, std::io::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        match this.inner.as_mut().poll_next(cx) {
            // 有新字节到来：截取 usage，透传原始字节
            Poll::Ready(Some(Ok(chunk))) => {
                this.try_extract_usage(&chunk);
                Poll::Ready(Some(Ok(chunk)))
            }

            // 流正常结束：发送截取到的 usage
            Poll::Ready(None) => {
                if let Some(tx) = this.usage_tx.take() {
                    let _ = tx.send(this.usage.take());
                }
                Poll::Ready(None)
            }

            // 上游出错：发送 None（扣费任务会记录 warn 日志）
            Poll::Ready(Some(Err(e))) => {
                if let Some(tx) = this.usage_tx.take() {
                    let _ = tx.send(None);
                }
                Poll::Ready(Some(Err(e)))
            }

            // 暂无数据：等待唤醒
            Poll::Pending => Poll::Pending,
        }
    }
}

// ─── TextOnlyStream（format=text 纯文字流）──────────────────────────────────────

/// 流结束时可选的「尾行」生成器：传入 usage，返回要追加的一行文字（如生成时间、token 计费）。
#[allow(dead_code)]
pub type TrailerFn = Option<Box<dyn FnOnce(StreamUsage) -> String + Send>>;

/// 解析上游 SSE，只输出 `choices[0].delta.content`；仍截取 usage 计费；可选追加尾行（生成时间、token 计费）。
#[allow(dead_code)]
pub struct TextOnlyStream {
    inner:         Pin<Box<dyn Stream<Item = Result<Vec<u8>, std::io::Error>> + Send>>,
    usage_tx:      Option<tokio::sync::oneshot::Sender<Option<StreamUsage>>>,
    usage:         Option<StreamUsage>,
    line_buf:      Vec<u8>,
    content_queue: VecDeque<Vec<u8>>,
    inner_done:    bool,
    trailer_fn:    TrailerFn,
}

#[allow(dead_code)]
impl TextOnlyStream {
    pub fn new(
        inner:      Pin<Box<dyn Stream<Item = Result<Vec<u8>, std::io::Error>> + Send>>,
        usage_tx:   tokio::sync::oneshot::Sender<Option<StreamUsage>>,
        trailer_fn: TrailerFn,
    ) -> Self {
        Self {
            inner,
            usage_tx: Some(usage_tx),
            usage: None,
            line_buf: Vec::new(),
            content_queue: VecDeque::new(),
            inner_done: false,
            trailer_fn,
        }
    }

    fn try_extract_usage(&mut self, line: &str) {
        let line = line.trim();
        if !line.starts_with("data:") || line == "data: [DONE]" {
            return;
        }
        let json_str = line.strip_prefix("data:").map(|s| s.trim()).unwrap_or("");
        if json_str.is_empty() {
            return;
        }
        if let Ok(v) = serde_json::from_str::<Value>(json_str) {
            if let Some(usage) = v.get("usage") {
                let pt = usage.get("prompt_tokens").and_then(|x| x.as_i64()).unwrap_or(0) as i32;
                let ct = usage.get("completion_tokens").and_then(|x| x.as_i64()).unwrap_or(0) as i32;
                if pt > 0 || ct > 0 {
                    self.usage = Some(StreamUsage { prompt_tokens: pt, completion_tokens: ct });
                }
            }
        }
    }

    fn try_extract_content(&mut self, line: &str) {
        let line = line.trim();
        if !line.starts_with("data:") || line == "data: [DONE]" {
            return;
        }
        let json_str = line.strip_prefix("data:").map(|s| s.trim()).unwrap_or("");
        if json_str.is_empty() {
            return;
        }
        let v = match serde_json::from_str::<Value>(json_str) {
            Ok(v) => v,
            Err(_) => return,
        };
        let s = v
            .get("choices").and_then(|c| c.get(0))
            .and_then(|c| c.get("delta")).and_then(|d| d.get("content"))
            .and_then(|c| c.as_str());
        let s = s.or_else(|| {
            v.get("choices").and_then(|c| c.get(0))
                .and_then(|c| c.get("message")).and_then(|m| m.get("content"))
                .and_then(|c| c.as_str())
        });
        let s = s.or_else(|| v.get("text").and_then(|c| c.as_str()));
        if let Some(s) = s {
            if !s.is_empty() {
                self.content_queue.push_back(s.as_bytes().to_vec());
            }
        }
    }

    /// 流结束时：把缓冲区剩余按行解析，避免最后一块无换行导致漏掉 content。
    fn flush_remainder(&mut self) {
        if self.line_buf.is_empty() {
            return;
        }
        let text = String::from_utf8_lossy(&self.line_buf).into_owned();
        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            self.try_extract_usage(line);
            self.try_extract_content(line);
        }
        self.line_buf.clear();
    }

    fn process_line_buf(&mut self) {
        let text = String::from_utf8_lossy(&self.line_buf).into_owned();
        let mut last_incomplete = None;
        let line_count = text.lines().count();
        for (i, line) in text.lines().enumerate() {
            let is_last = i + 1 == line_count;
            let ends_with_newline = self.line_buf.ends_with(b"\n");
            if is_last && !ends_with_newline {
                last_incomplete = Some(line.as_bytes().to_vec());
                break;
            }
            self.try_extract_usage(line);
            self.try_extract_content(line);
        }
        self.line_buf.clear();
        if let Some(rest) = last_incomplete {
            self.line_buf.extend_from_slice(&rest);
        }
    }
}

#[allow(dead_code)]
impl Stream for TextOnlyStream {
    type Item = Result<Vec<u8>, std::io::Error>;

    fn poll_next(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Option<Self::Item>> {
        let this = self.get_mut();

        if let Some(content) = this.content_queue.pop_front() {
            return Poll::Ready(Some(Ok(content)));
        }
        if this.inner_done {
            if let Some(tx) = this.usage_tx.take() {
                let _ = tx.send(this.usage.take());
            }
            return Poll::Ready(None);
        }

        // 循环读 inner 直到至少有一个 content 可返回 直到至少有一个 content 可返回，再返回；避免“无 content 就 Pending”导致不再被 poll 而不出字
        loop {
            match this.inner.as_mut().poll_next(cx) {
                Poll::Ready(Some(Ok(chunk))) => {
                    this.line_buf.extend_from_slice(&chunk);
                    this.process_line_buf();
                    if let Some(content) = this.content_queue.pop_front() {
                        return Poll::Ready(Some(Ok(content)));
                    }
                }
                Poll::Ready(None) => {
                    this.process_line_buf();
                    this.flush_remainder();
                    this.inner_done = true;
                    if let Some(content) = this.content_queue.pop_front() {
                        return Poll::Ready(Some(Ok(content)));
                    }
                    if let (Some(usage), Some(trailer_fn)) = (this.usage.clone(), this.trailer_fn.take()) {
                        let trailer = trailer_fn(usage);
                        this.content_queue.push_back(trailer.into_bytes());
                        if let Some(content) = this.content_queue.pop_front() {
                            return Poll::Ready(Some(Ok(content)));
                        }
                    }
                    if let Some(tx) = this.usage_tx.take() {
                        let _ = tx.send(this.usage.take());
                    }
                    return Poll::Ready(None);
                }
                Poll::Ready(Some(Err(e))) => {
                    if let Some(tx) = this.usage_tx.take() {
                        let _ = tx.send(None);
                    }
                    return Poll::Ready(Some(Err(e)));
                }
                Poll::Pending => return Poll::Pending,
            }
        }
    }
}
