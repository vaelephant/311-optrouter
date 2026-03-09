#!/bin/bash

# ==============================================================================
# OptRouter 智能分层路由 - 集成验证脚本
# ==============================================================================
# 使用说明:
# 1. 确保网关服务已启动 (cargo run)
# 2. 修改下方的 API_KEY 为有效的数据库 Key
# 3. 运行脚本: bash test_optrouter.sh
# ==============================================================================

# --- 配置区 ---
API_BASE="http://localhost:3000/v1"
API_KEY="your_api_key_here" # <--- 请在此处填入有效的 API Key
SESSION_ID=$(uuidgen)

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${YELLOW}          🚀 OptRouter 智能路由自动化验证程序          ${NC}"
echo -e "${YELLOW}==================================================================${NC}"
echo -e "Session ID: ${BLUE}$SESSION_ID${NC}"
echo -e "API Base  : $API_BASE"
echo

# ------------------------------------------------------------------------------
# 场景 1: 默认透传 (Standard Passthrough)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[场景 1] 默认模型请求 (未显式开启分层)${NC}"
echo -e "${YELLOW}测试目的:${NC} 验证系统稳定性。当用户未设置 Header 且请求具体模型名时，网关应 100% 透传，不干预决策。"
echo -e "${YELLOW}预期行为:${NC}"
echo -e "  - API 响应: 返回的模型必须是 'gpt-4o'"
echo -e "  - 网关日志: 应显示 'static routing'，且 'routing_enabled=false'"

RESPONSE=$(curl -s -X POST "$API_BASE/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "你好，请简单自我介绍"}]
  }')

MODEL=$(echo $RESPONSE | jq -r '.model')
echo -e "${GREEN}实际输出模型:${NC} $MODEL"
echo

# ------------------------------------------------------------------------------
# 场景 2: 显式开启虚拟模型 (Virtual Model Tier)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[场景 2] 虚拟模型请求 (Request: eco)${NC}"
echo -e "${YELLOW}测试目的:${NC} 验证分层路由触发。当用户请求 'eco' 等虚拟模型名时，系统应自动匹配该档位下的最优低价模型。"
echo -e "${YELLOW}预期行为:${NC}"
echo -e "  - API 响应: 返回的模型通常是 'gpt-4o-mini' 或其他经济型模型"
echo -e "  - 网关日志: 应显示 'layer 1/2 routing success'，且 'routing_enabled=true'"

RESPONSE=$(curl -s -X POST "$API_BASE/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{
    "model": "eco",
    "messages": [{"role": "user", "content": "1+1等于几？"}]
  }')

MODEL=$(echo $RESPONSE | jq -r '.model')
echo -e "${GREEN}实际输出模型:${NC} $MODEL"
echo

# ------------------------------------------------------------------------------
# 场景 3: 智能意图识别 - 代码识别 (Code Intent Recognition)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[场景 3] 复杂意图分层 (Request: auto + Code Context)${NC}"
echo -e "${YELLOW}测试目的:${NC} 验证启发式规则 (Layer 1)。当识别到代码块或代码意图时，系统应自动升档到 'code' 或 'premium'。"
echo -e "${YELLOW}预期行为:${NC}"
echo -e "  - API 响应: 返回高质量模型（如 gpt-4o 或专门的代码模型）"
echo -e "  - 网关日志: 应包含 'reasons=[\"Detected code blocks/syntax\"]'"

RESPONSE=$(curl -s -X POST "$API_BASE/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "X-Session-Id: $SESSION_ID" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "请用 Rust 写一个高并发的 Web Server 示例，要求展示如何处理生命周期。"}]
  }')

MODEL=$(echo $RESPONSE | jq -r '.model')
echo -e "${GREEN}实际输出模型:${NC} $MODEL"
echo

# ------------------------------------------------------------------------------
# 场景 4: Header 驱动的分层开关 (Header-driven Optimization)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[场景 4] Header 显式激活分层 (gpt-4o + Intelligent Header)${NC}"
echo -e "${YELLOW}测试目的:${NC} 验证 Header 开关。即使请求具体模型名，若携带了分层 Header，网关仍会尝试进行成本优化（如：判定此任务简单，降级到 mini 以省钱）。"
echo -e "${YELLOW}预期行为:${NC}"
echo -e "  - API 响应: 虽然请求 gpt-4o，但实际可能返回 gpt-4o-mini（如果任务简单）"
echo -e "  - 网关日志: 应显示 'intelligent routing decision'，且 'routing_enabled=true'"

RESPONSE=$(curl -s -X POST "$API_BASE/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "X-Opt-Strategy: intelligent" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "讲一个只有三个字的冷笑话"}]
  }')

MODEL=$(echo $RESPONSE | jq -r '.model')
echo -e "${GREEN}实际输出模型:${NC} $MODEL"
echo

# ------------------------------------------------------------------------------
# 场景 5: 节省金额统计与异步摘要验证 (Analytics & Summary Verification)
# ------------------------------------------------------------------------------
echo -e "${BLUE}[场景 5] 后台处理验证 (Analytics & Summary)${NC}"
echo -e "${YELLOW}验证说明:${NC} 本步骤无需查看 curl 输出，请立即检查网关【控制台日志】。"
echo -e "${YELLOW}检查点 1 (节省统计):${NC} 检查是否出现 'insert usage_log'，其中 'saved_cost' 应大于 0 (对于成功的场景 2/3/4)。"
echo -e "${YELLOW}检查点 2 (智能摘要):${NC} 检查是否出现 'smart summary updated'，且 topic 应精准描述前文内容。"
echo

echo -e "${YELLOW}==================================================================${NC}"
echo -e "${GREEN}✅ 客户端请求模拟完成！请查看网关控制台获取最终验证结果。${NC}"
echo -e "${YELLOW}==================================================================${NC}"
