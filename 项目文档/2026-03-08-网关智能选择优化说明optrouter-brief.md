# 🚀 OptRouter 智能分层路由功能简报 (v1.0)

本计划旨在通过三层路由机制优化模型调用成本，同时保持极高的系统稳定性和上下文感知能力。

## 1. 核心定义：分层档位 (Tiers)
OptRouter 预设了 6 个标准档位，自动匹配最合适的底层模型：
*   **eco**: 简单/琐碎任务（如：打招呼、查简单事实），路由至极低价模型。
*   **balanced**: 标准对话，兼顾响应速度与理解力。
*   **premium**: 复杂逻辑、创意写作或高风险任务，路由至顶配模型（如 GPT-4o）。
*   **code**: 编程、调试、SQL/JSON 构造等任务。
*   **reasoning**: 深度推理、数学题、多步逻辑推导。
*   **longctx**: 需要超长上下文记忆的任务。

## 2. 核心机制：三层决策过滤
当智能路由激活时，请求将按顺序经过以下过滤：
1.  **Layer 1 (启发式规则)**: 毫秒级本地识别。通过消息长度、代码特征、意图关键词（fix, optimize等）进行初步打分。
2.  **Layer 2 (上下文感知)**: 读取 Redis 中的 `SessionSummary`。即使当前 Prompt 极短，也能通过历史对话目标（Goal）锁定正确档位。
3.  **Layer 3 (小模型复判)**: 兜底机制。前两层置信度不足时，异步调用 `gpt-4o-mini` 进行精准意图分类（限时 2s）。

## 3. 激活策略：默认透传，显式开启
为确保生产环境的**可预测性**，系统默认关闭路由优化（100% 静态透传）。
**开启方式：**
*   **虚拟模型名**: 请求 `model` 为 `auto`, `eco`, `balanced`, `premium`, `code`, `reasoning`。
*   **显式 Header**: 请求携带 `X-Opt-Strategy: intelligent`。

## 4. 后台辅助功能
*   **异步智能摘要**: 对话结束后，系统异步提取 Topic 和 Goal 存入 Redis，为下一轮路由提供“记忆”。
*   **节省金额统计**: 自动计算 `基准成本 - 实际成本`，并将差额持久化至 `usage_logs.saved_cost`。

---

## 5. 快速测试 (Quick Start)
1.  **执行验证脚本**: `bash test_optrouter.sh`
2.  **观察网关日志**:
    *   `static routing`: 表示分层关闭（符合预期）。
    *   `intelligent routing success`: 表示分层成功激活。
    *   `smart summary updated`: 表示异步摘要已入库。
3.  **数据库对账**:
    ```sql
    SELECT model, requested_model, cost, saved_cost FROM usage_logs ORDER BY id DESC LIMIT 5;
    ```

## 6. 开发注意事项
*   **Redis**: 必须运行（用于摘要存储）。
*   **DB 变动**: 需确保 `usage_logs` 表已增加 `saved_cost` 字段：
    `ALTER TABLE usage_logs ADD COLUMN saved_cost NUMERIC(10,6) DEFAULT 0;`
