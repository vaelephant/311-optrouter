# 8-API Key 使用指南

## 📋 概述

本文档详细说明如何创建、测试和使用 API Key 来调用 AI 模型 API。

## 🔑 创建 API Key

### 步骤

1. **登录系统**
   - 访问 `http://localhost:3000/login`
   - 使用邮箱和密码登录

2. **进入 API Keys 页面**
   - 登录后，点击侧边栏的 "API 密钥" 或直接访问 `http://localhost:3000/keys`

3. **创建新的 API Key**
   - 点击 "新建密钥" 按钮
   - 系统会生成一个新的 API Key（格式：`sk-xxx-xxx`）
   - **重要：立即复制并保存 API Key，它只会显示一次！**

## 🧪 测试 API Key

### 前置条件

1. **确保服务已启动**
   ```bash
   # 启动 Next.js 开发服务器
   cd web
   npm run dev
   
   # 启动 Rust Gateway（如果使用）
   cd gateway
   cargo run
   ```

2. **获取 API Key**
   - 从 `/keys` 页面复制你的 API Key

### 方法 1：使用 curl（命令行）

#### 非流式请求（一次返回完整结果）

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "stream": false
  }'
```

**使用 `x-api-key` 头（替代方案）：**

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "x-api-key: sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "你好"}
    ]
  }'
```

#### 流式请求（SSE 实时返回）

```bash
curl -N -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "讲一个关于编程的故事"}
    ],
    "stream": true
  }'
```

**说明：**
- `-N` 参数：关闭 curl 缓冲，实时显示数据
- 流式返回格式：`data: {...}` 每行一条 JSON

#### 格式化输出（使用 jq）

```bash
# 非流式请求，使用 jq 格式化 JSON
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer sk-your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }' | jq
```

### 方法 2：使用 JavaScript/TypeScript

#### Node.js / 浏览器

```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your-api-key-here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: '你好，请介绍一下你自己' }
    ],
    stream: false, // 设置为 true 启用流式响应
  }),
})

const data = await response.json()
console.log(data.choices[0].message.content)
```

#### 流式响应处理

```javascript
const response = await fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk-your-api-key-here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'user', content: '讲一个故事' }
    ],
    stream: true,
  }),
})

const reader = response.body.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break

  const chunk = decoder.decode(value)
  const lines = chunk.split('\n')

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6)
      if (data === '[DONE]') {
        console.log('流式响应完成')
        break
      }
      try {
        const json = JSON.parse(data)
        const content = json.choices[0]?.delta?.content
        if (content) {
          process.stdout.write(content) // 实时输出内容
        }
      } catch (e) {
        // 忽略解析错误
      }
    }
  }
}
```

### 方法 3：使用 Python

#### 使用 OpenAI SDK（推荐）

```python
from openai import OpenAI

# 初始化客户端
client = OpenAI(
    api_key="sk-your-api-key-here",
    base_url="http://localhost:3000/api"  # 你的 API 地址
)

# 非流式请求
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    stream=False
)

print(response.choices[0].message.content)
```

#### 流式请求

```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-your-api-key-here",
    base_url="http://localhost:3000/api"
)

# 流式请求
stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "讲一个关于编程的故事"}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end='', flush=True)
```

#### 使用 requests 库（原生 HTTP）

```python
import requests
import json

url = "http://localhost:3000/api/chat"
headers = {
    "Authorization": "Bearer sk-your-api-key-here",
    "Content-Type": "application/json"
}
data = {
    "model": "gpt-4o",
    "messages": [
        {"role": "user", "content": "你好"}
    ],
    "stream": False
}

response = requests.post(url, headers=headers, json=data)
result = response.json()
print(result["choices"][0]["message"]["content"])
```

### 方法 4：使用 Postman

1. **创建新请求**
   - Method: `POST`
   - URL: `http://localhost:3000/api/chat`

2. **设置 Headers**
   - `Authorization`: `Bearer sk-your-api-key-here`
   - `Content-Type`: `application/json`

3. **设置 Body**
   - 选择 `raw` 和 `JSON`
   - 输入：
   ```json
   {
     "model": "gpt-4o",
     "messages": [
       {"role": "user", "content": "你好"}
     ],
     "stream": false
   }
   ```

4. **发送请求**
   - 点击 "Send" 按钮

## 📡 API 端点说明

### 1. Chat Completions（对话接口）

**端点：** `POST /api/chat`

**请求头：**
- `Authorization: Bearer sk-xxx` 或 `x-api-key: sk-xxx`
- `Content-Type: application/json`

**请求体：**
```json
{
  "model": "gpt-4o",              // 必需：模型名称
  "messages": [                    // 必需：对话消息数组
    {
      "role": "user",              // user | assistant | system
      "content": "你好"
    }
  ],
  "stream": false,                 // 可选：是否流式返回（默认 false）
  "temperature": 0.7,              // 可选：温度参数（0-2）
  "max_tokens": 1000,              // 可选：最大 token 数
  "top_p": 1.0                     // 可选：top_p 参数
}
```

**响应格式（非流式）：**
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是 AI 助手..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

**响应格式（流式）：**
```
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"role":"assistant"},"index":0}]}

data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"你好"},"index":0}]}

data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"！"},"index":0}]}

...

data: [DONE]
```

### 2. Models List（模型列表）

**端点：** `GET /api/models`

**请求头：**
- 不需要认证（或可选）

**响应格式：**
```json
{
  "data": [
    {"id": "gpt-4o"},
    {"id": "gpt-4"},
    {"id": "claude-3-opus"}
  ]
}
```

## 🔍 常见问题

### 1. 认证失败

**错误：** `401 Unauthorized` 或 `Missing API key`

**解决方案：**
- 检查 API Key 是否正确复制（包含 `sk-` 前缀）
- 确认请求头格式正确：`Authorization: Bearer sk-xxx`
- 检查 API Key 状态是否为 `active`

### 2. 模型不存在

**错误：** `Model not found`

**解决方案：**
- 先调用 `GET /api/models` 查看可用模型列表
- 确认模型名称拼写正确

### 3. 流式响应不工作

**问题：** 流式请求返回完整 JSON 而不是逐行数据

**解决方案：**
- 确认 `stream: true` 已设置
- 使用 `-N` 参数运行 curl
- 检查客户端是否正确处理 SSE 格式

### 4. 限流错误

**错误：** `Rate limit exceeded`

**解决方案：**
- 检查 API Key 的 `rate_limit_per_min` 设置
- 降低请求频率
- 等待限流窗口重置

## 📊 查看使用统计

### 在 Dashboard 查看

1. 访问 `http://localhost:3000/dashboard`
2. 查看 "最近请求" 区域，可以看到最近的 API 调用记录
3. 查看统计卡片，了解总使用量、成本等信息

### 通过 API 查看

```bash
# 获取使用统计（需要登录，通过 x-user-id 头）
curl http://localhost:3000/api/usage?days=30 \
  -H "x-user-id: your-user-id"
```

## 🛠️ 开发环境配置

### 本地开发

**Next.js 服务：**
- 默认地址：`http://localhost:3000`
- 启动命令：`cd web && npm run dev`

**Rust Gateway（如果使用）：**
- 默认地址：`http://localhost:3001`
- 启动命令：`cd gateway && cargo run`

### 生产环境

**API 地址：**
- 替换 `localhost:3000` 为你的生产域名
- 例如：`https://api.yourdomain.com`

## 📝 最佳实践

1. **安全存储 API Key**
   - 不要将 API Key 提交到代码仓库
   - 使用环境变量存储
   - 定期轮换 API Key

2. **错误处理**
   - 始终检查 HTTP 状态码
   - 处理网络错误和超时
   - 实现重试机制（带退避）

3. **流式响应**
   - 对于长文本生成，使用流式响应提升用户体验
   - 正确处理 SSE 格式
   - 处理连接中断情况

4. **成本控制**
   - 设置合理的 `max_tokens` 限制
   - 监控使用量和成本
   - 使用缓存减少重复请求

## 🔗 相关文档

- [登录注册功能说明](./5-登录注册功能说明.md)
- [项目目录架构](./4-项目目录架构.md)
- [用户 API 实现方式](./1-用户%20api%20的实现方式.md)
