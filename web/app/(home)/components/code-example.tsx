"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

const codeExamples = {
  javascript: `// 完全兼容 OpenAI SDK
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.optrouter.com/v1',
  apiKey: process.env.OPTROUTER_API_KEY,
});

const response = await client.chat.completions.create({
  model: 'gpt-4o',
  messages: [
    { role: 'user', content: '你好，请介绍一下你自己' }
  ],
});

console.log(response.choices[0].message.content);`,

  python: `# 使用 OpenAI Python SDK
from openai import OpenAI

client = OpenAI(
    base_url="https://api.optrouter.com/v1",
    api_key=os.environ.get("OPTROUTER_API_KEY"),
)

response = client.chat.completions.create(
    model="claude-3-5-sonnet",
    messages=[
        {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
)

print(response.choices[0].message.content)`,

  curl: `curl https://api.optrouter.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $OPTROUTER_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "stream": true
  }'`,
}

const tabs = [
  { id: "javascript", label: "JavaScript" },
  { id: "python", label: "Python" },
  { id: "curl", label: "cURL" },
]

export function CodeExample() {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>("javascript")
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(codeExamples[activeTab])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section 
      id="docs" 
      className="border-t py-24"
      style={{
        borderColor: 'var(--color-border-default)',
        paddingTop: 'var(--layout-section-spacing)',
        paddingBottom: 'var(--layout-section-spacing)',
      }}
    >
      <div 
        className="mx-auto max-w-7xl px-6"
        style={{ maxWidth: 'var(--layout-max-width)' }}
      >
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left Content */}
          <div className="flex flex-col justify-center">
            <h2 
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
              }}
            >
              几分钟内完成集成
            </h2>
            <p 
              style={{
                marginTop: 'var(--space-4)',
                fontSize: '18px',
                lineHeight: '1.6',
                color: 'var(--color-text-body)',
              }}
            >
              完全兼容 OpenAI API 格式，只需更改 baseURL 即可切换到 OptRouter。
              支持所有 OpenAI SDK、LangChain、LlamaIndex 等框架。
            </p>
            <ul 
              className="mt-8 space-y-4"
              style={{ marginTop: 'var(--space-6)' }}
            >
              {[
                "完全兼容 OpenAI API 格式",
                "支持流式响应和函数调用",
                "智能路由与自动 fallback",
                "详细的 TypeScript 类型定义",
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div 
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: 'var(--color-bg-muted)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span style={{ color: 'var(--color-text-body)' }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right Code Block */}
          <div 
            className="overflow-hidden rounded-xl border"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'var(--color-bg-surface)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            {/* Tab Header */}
            <div 
              className="flex items-center justify-between border-b px-4"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-muted)',
              }}
            >
              <div className="flex">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as keyof typeof codeExamples)}
                    className="border-b-2 px-4 py-3 text-sm transition-colors"
                    style={{
                      borderBottomColor: activeTab === tab.id
                        ? 'var(--color-text-primary)'
                        : 'transparent',
                      color: activeTab === tab.id
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-body)',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-surface"
                style={{
                  color: 'var(--color-text-body)',
                  transition: 'background-color var(--motion-base) var(--ease-standard)',
                }}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    复制
                  </>
                )}
              </button>
            </div>

            {/* Code Content */}
            <pre 
              className="overflow-x-auto p-6"
              style={{
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <code 
                className="text-sm leading-relaxed"
                style={{
                  color: 'var(--color-text-body)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {codeExamples[activeTab]}
              </code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  )
}
