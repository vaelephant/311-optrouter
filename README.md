# OptRouter - AI 模型统一网关

一个统一的大模型 API 网关，支持通过单一接口调用多家 AI 模型。

## 项目架构

```
┌──────────────────────┐
│    Next.js App       │  (产品层: 用户管理、API Key、计费)
└──────────┬───────────┘
           │ HTTP
           ▼
┌──────────────────────┐
│   Rust Gateway       │  (核心: 模型路由、fallback、流式代理)
└──────────────────────┘
           │
           ▼
    AI Model Providers
  (OpenAI / Claude / Google)
```

## 快速开始

### 前置要求

- Node.js 18+
- Rust 1.70+
- PostgreSQL (可选，用于生产环境)

### 1. 启动前端 (Next.js)

```bash
cd web

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

访问 http://localhost:3000

### 2. 启动 Rust Gateway (可选)

```bash
cd gateway

# 安装 Rust 依赖
cargo build

# 启动 Gateway
cargo run
```

Gateway 默认运行在 http://localhost:3001

## 目录结构

```
web/                    # Next.js 前端
├── app/
│   ├── api/           # API 路由
│   │   ├── chat/      # 聊天 API
│   │   ├── keys/      # API Key 管理
│   │   └── usage/     # 使用量统计
│   └── dashboard/     # 用户仪表盘
├── lib/               # 工具库
│   ├── db.ts          # Prisma 客户端
│   ├── auth.ts        # 认证中间件
│   └── gateway.ts     # Gateway 客户端
└── prisma/            # 数据库 Schema

gateway/               # Rust Gateway
├── src/
│   ├── main.rs            # 二进制入口（init log + dotenv + run()）
│   ├── lib.rs             # 库入口（build_app / build_state / run / pub mod）
│   ├── api/               # HTTP 层（请求解析 → 调用 application → 返回响应）
│   ├── application/       # 应用编排层（鉴权/限流/余额/路由/扣费）
│   │   ├── auth_service.rs    # API Key 验证（Redis 缓存 + Postgres 回源）
│   │   └── chat_service.rs    # chat completions 完整业务流程
│   ├── config/            # 全局配置
│   ├── db/                # 数据库访问层（pg / redis / types）
│   ├── error.rs           # 统一错误类型
│   ├── metrics/           # 计量（compute_cost）
│   ├── middleware/        # HTTP 工具（Bearer 提取 / SHA-256）
│   ├── protocol/          # 对外 API 协议结构（OpenAI 兼容格式）
│   ├── providers/         # AI Provider 适配层（OpenAI / Anthropic / Google 等）
│   ├── proxy/             # SSE 流代理（AccountingStream）
│   ├── router/            # 模型路由策略（registry + model_router）
│   └── startup/           # 启动自检（bootstrap / healthcheck）
└── Cargo.toml
```

## API 使用

### 聊天 API

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 流式响应

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

## Dashboard 页面

| 页面 | 路径 | 说明 |
|------|------|------|
| 仪表盘 | `/dashboard` | 概览统计 |
| API Keys | `/dashboard/keys` | 管理密钥 |
| 使用量 | `/dashboard/usage` | 使用统计 |
| 设置 | `/dashboard/settings` | 账户配置 |

## 环境变量

### web/.env
```env
DATABASE_URL=postgresql://user:password@localhost:5432/OptRouter
GATEWAY_URL=http://localhost:3001
```

### gateway/.env
```env
PORT=3001
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

## 技术栈

- **前端**: Next.js 16, React 19, Tailwind CSS
- **后端**: Rust, Axum, Tokio
- **数据库**: PostgreSQL, Prisma
- **AI Providers**: OpenAI, Anthropic, Google Gemini

## License

MIT
