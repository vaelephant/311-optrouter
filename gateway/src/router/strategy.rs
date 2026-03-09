use super::types::{ModelTier, RequestProfile, RoutingDecision, SessionSummary};
use std::collections::HashMap;

/// 启发式评分器：基于请求特征为各档位打分
pub struct HeuristicScorer;

impl HeuristicScorer {
    pub fn score(profile: &RequestProfile) -> HashMap<ModelTier, f32> {
        let mut scores = HashMap::new();
        
        // 初始分数
        scores.insert(ModelTier::Eco, 1.0);
        scores.insert(ModelTier::Balanced, 1.0);
        scores.insert(ModelTier::Premium, 0.5); // Premium 默认分数稍低，除非有明确需求
        scores.insert(ModelTier::Code, 0.0);
        scores.insert(ModelTier::Reasoning, 0.0);
        scores.insert(ModelTier::LongCtx, 0.0);

        // 1. 基于长度的评分
        if profile.message_length > 10000 {
            *scores.entry(ModelTier::LongCtx).or_default() += 2.0;
            *scores.entry(ModelTier::Premium).or_default() += 1.0;
        } else if profile.message_length > 2000 {
            *scores.entry(ModelTier::Balanced).or_default() += 1.0;
        } else {
            *scores.entry(ModelTier::Eco).or_default() += 0.5;
        }

        // 2. 基于代码/JSON/SQL 的评分
        if profile.has_code {
            *scores.entry(ModelTier::Code).or_default() += 3.0;
            *scores.entry(ModelTier::Premium).or_default() += 1.0;
        }
        if profile.has_json || profile.has_sql {
            *scores.entry(ModelTier::Balanced).or_default() += 1.0;
            *scores.entry(ModelTier::Premium).or_default() += 0.5;
        }

        // 3. 基于历史深度的评分
        if profile.history_depth > 15 {
            *scores.entry(ModelTier::LongCtx).or_default() += 1.5;
            *scores.entry(ModelTier::Premium).or_default() += 1.0;
        } else if profile.history_depth > 5 {
            *scores.entry(ModelTier::Balanced).or_default() += 0.5;
        }

        // 4. 基于意图关键词的评分
        for intent in &profile.intent_keywords {
            match intent.as_str() {
                "optimize" | "refactor" => {
                    *scores.entry(ModelTier::Code).or_default() += 1.5;
                    *scores.entry(ModelTier::Premium).or_default() += 1.0;
                }
                "fix" | "analyze" => {
                    *scores.entry(ModelTier::Premium).or_default() += 1.0;
                    *scores.entry(ModelTier::Balanced).or_default() += 0.5;
                }
                "explain" | "summarize" => {
                    *scores.entry(ModelTier::Balanced).or_default() += 1.0;
                    *scores.entry(ModelTier::Eco).or_default() += 0.5;
                }
                _ => {}
            }
        }

        // 5. 用户偏好（显式指定）
        if let Some(tier) = profile.preferred_tier {
            *scores.entry(tier).or_default() += 10.0;
        }

        scores
    }
}

/// Layer 1 粗路由引擎
pub struct CoarseRouter {
    pub threshold: f32,
}

impl Default for CoarseRouter {
    fn default() -> Self {
        Self { threshold: 0.8 }
    }
}

impl CoarseRouter {
    pub fn route(&self, profile: &RequestProfile) -> Option<RoutingDecision> {
        let scores = HeuristicScorer::score(profile);
        
        let mut best_tier = ModelTier::Balanced;
        let mut max_score = 0.0;
        let mut total_score = 0.0;

        for (tier, score) in &scores {
            total_score += score;
            if *score > max_score {
                max_score = *score;
                best_tier = *tier;
            }
        }

        let confidence = if total_score > 0.0 {
            max_score / total_score
        } else {
            0.0
        };

        if confidence >= self.threshold || profile.preferred_tier.is_some() {
            let mut reasons = Vec::new();
            if profile.has_code { reasons.push("Detected code blocks/syntax".to_string()); }
            if profile.message_length > 5000 { reasons.push("Large message body".to_string()); }
            if profile.history_depth > 10 { reasons.push("Deep conversation history".to_string()); }
            if !profile.intent_keywords.is_empty() {
                reasons.push(format!("Intent keywords: {}", profile.intent_keywords.join(", ")));
            }
            if profile.preferred_tier.is_some() { reasons.push("User explicitly requested tier".to_string()); }

            Some(RoutingDecision {
                target_model: String::new(),
                tier: best_tier,
                confidence,
                reason: reasons,
                fallback_models: Vec::new(),
            })
        } else {
            None
        }
    }
}

/// Layer 2 上下文增强路由引擎
pub struct ContextualRouter {
    pub threshold: f32,
}

impl Default for ContextualRouter {
    fn default() -> Self {
        Self { threshold: 0.75 }
    }
}

impl ContextualRouter {
    pub fn route(&self, profile: &RequestProfile, summary: &SessionSummary) -> Option<RoutingDecision> {
        let mut scores = HeuristicScorer::score(profile);

        if summary.task_type == "code" {
            *scores.entry(ModelTier::Code).or_default() += 2.0;
            *scores.entry(ModelTier::Premium).or_default() += 1.0;
        }

        if summary.history_depth > 10 {
            *scores.entry(ModelTier::LongCtx).or_default() += 1.0;
            *scores.entry(ModelTier::Premium).or_default() += 0.5;
        }

        if let Some(mode) = summary.preferred_mode {
            *scores.entry(mode).or_default() += 2.0;
        }

        if summary.risk_level == "high" {
            *scores.entry(ModelTier::Premium).or_default() += 2.0;
        }

        let mut best_tier = ModelTier::Balanced;
        let mut max_score = 0.0;
        let mut total_score = 0.0;

        for (tier, score) in &scores {
            total_score += score;
            if *score > max_score {
                max_score = *score;
                best_tier = *tier;
            }
        }

        let confidence = if total_score > 0.0 {
            max_score / total_score
        } else {
            0.0
        };

        if confidence >= self.threshold {
            let mut reasons = Vec::new();
            reasons.push(format!("Contextual match: topic='{}', task='{}'", summary.topic, summary.task_type));
            if summary.risk_level == "high" { reasons.push("High risk task requires premium model".to_string()); }

            Some(RoutingDecision {
                target_model: String::new(),
                tier: best_tier,
                confidence,
                reason: reasons,
                fallback_models: Vec::new(),
            })
        } else {
            None
        }
    }
}

/// Layer 3 精细路由引擎 (小模型复判)
pub struct RefinedRouter {
    pub model: String, // 用于分类的小模型名，如 "gpt-4o-mini" 或 "deepseek-chat"
}

impl Default for RefinedRouter {
    fn default() -> Self {
        Self {
            model: "gpt-4o-mini".to_string(),
        }
    }
}

impl RefinedRouter {
    pub fn build_prompt(&self, message: &str, summary: Option<&SessionSummary>) -> String {
        let summary_text = if let Some(s) = summary {
            format!("\nSession Context:\n- Topic: {}\n- Task Type: {}\n- History Depth: {}", s.topic, s.task_type, s.history_depth)
        } else {
            "".to_string()
        };

        format!(
            "You are an expert AI router. Your task is to classify the user's request into the most appropriate tier.\n\
            Available Tiers:\n\
            - eco: Simple, short questions, or trivial tasks (e.g., greetings, basic facts).\n\
            - balanced: Standard requests, general analysis, and typical chat.\n\
            - premium: High-quality reasoning, complex creative writing, or high-risk tasks.\n\
            - code: Programming, debugging, or complex logic/SQL/JSON tasks.\n\
            - reasoning: Tasks requiring deep logical steps, math, or intense problem-solving.\n\
            - longctx: Very long inputs or requests requiring memory of many previous turns.\n\
            {}\n\n\
            User Message: \"{}\"\n\n\
            Respond ONLY with the tier name (eco, balanced, premium, code, reasoning, longctx).",
            summary_text,
            message
        )
    }

    pub fn parse_tier(&self, response: &str) -> ModelTier {
        let r = response.trim().to_lowercase();
        if r.contains("eco") { ModelTier::Eco }
        else if r.contains("code") { ModelTier::Code }
        else if r.contains("reasoning") { ModelTier::Reasoning }
        else if r.contains("longctx") { ModelTier::LongCtx }
        else if r.contains("premium") { ModelTier::Premium }
        else { ModelTier::Balanced }
    }

    /// 构造更新摘要的 Prompt
    pub fn build_summary_prompt(&self, messages_json: &str) -> String {
        format!(
            "You are an expert conversation analyst. Your task is to summarize the following conversation into a structured JSON object.\n\n\
            Conversation History:\n{}\n\n\
            Required JSON Structure:\n\
            {{\n\
              \"topic\": \"A brief summary of the main topic (max 10 words)\",\n\
              \"task_type\": \"chat\" | \"code\" | \"analysis\" | \"writing\" | \"planning\",\n\
              \"current_goal\": \"What the user is currently trying to achieve\",\n\
              \"risk_level\": \"low\" | \"medium\" | \"high\",\n\
              \"history_depth\": count_of_messages\n\
            }}\n\n\
            Respond ONLY with valid JSON.",
            messages_json
        )
    }
}
