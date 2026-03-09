use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::protocol::ChatCompletionRequest;

/// 模型档位 (Tier)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ModelTier {
    Eco,
    Balanced,
    Premium,
    Code,
    Reasoning,
    LongCtx,
}

/// 模型能力画像
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModelCapability {
    pub supports_json: bool,
    pub supports_tools: bool,
    pub supports_vision: bool,
    pub max_context: i32,
}

/// 请求特征分析 (Layer 1)
#[derive(Debug, Clone, Default)]
pub struct RequestProfile {
    pub message_length: usize,
    pub history_depth: usize,
    pub has_code: bool,
    pub has_json: bool,
    pub has_sql: bool,
    pub is_new_session: bool,
    pub intent_keywords: Vec<String>,
    pub preferred_tier: Option<ModelTier>,
}

impl RequestProfile {
    pub fn from_request(req: &ChatCompletionRequest) -> Self {
        let last_message = req.messages.last().map(|m| m.content.as_str()).unwrap_or("");
        let history_depth = req.messages.len();
        
        let has_code = last_message.contains("```") || 
                       last_message.contains("fn ") || 
                       last_message.contains("public class") ||
                       last_message.contains("def ");
                       
        let has_json = last_message.contains("{") && last_message.contains("}") && 
                       (last_message.contains("\"") || last_message.contains(":"));
                       
        let has_sql = last_message.to_uppercase().contains("SELECT ") || 
                      last_message.to_uppercase().contains("UPDATE ") ||
                      last_message.to_uppercase().contains("INSERT INTO ");

        let mut intent_keywords = Vec::new();
        let intents = ["optimize", "fix", "explain", "rewrite", "refactor", "analyze", "summarize"];
        for intent in intents {
            if last_message.to_lowercase().contains(intent) {
                intent_keywords.push(intent.to_string());
            }
        }

        Self {
            message_length: last_message.len(),
            history_depth,
            has_code,
            has_json,
            has_sql,
            is_new_session: history_depth <= 1,
            intent_keywords,
            preferred_tier: None, // Will be filled by router if needed
        }
    }
}

/// 会话摘要 (Layer 2)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionSummary {
    pub session_id: Uuid,
    pub topic: String,
    pub task_type: String,
    pub current_goal: String,
    pub recent_artifacts: Vec<String>,
    pub history_depth: usize,
    pub risk_level: String, // "low", "medium", "high"
    pub preferred_mode: Option<ModelTier>,
}

/// 路由决策结果
#[derive(Debug, Clone)]
pub struct RoutingDecision {
    pub target_model: String,
    pub tier: ModelTier,
    pub confidence: f32,
    pub reason: Vec<String>,
    pub fallback_models: Vec<String>,
}
