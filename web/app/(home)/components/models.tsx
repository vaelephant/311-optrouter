"use client"

import { useState } from "react"
import { Check, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const modelCategories = [
  { id: "all", label: "全部" },
  { id: "text", label: "文本生成" },
  { id: "image", label: "图像生成" },
  { id: "code", label: "代码" },
  { id: "embedding", label: "向量" },
]

const models = [
  {
    name: "GPT-4o",
    provider: "OpenAI",
    category: "text",
    contextLength: "128K",
    inputPrice: "$2.50",
    outputPrice: "$10.00",
    features: ["函数调用", "JSON 模式", "视觉理解"],
  },
  {
    name: "GPT-4 Turbo",
    provider: "OpenAI",
    category: "text",
    contextLength: "128K",
    inputPrice: "$10.00",
    outputPrice: "$30.00",
    features: ["函数调用", "JSON 模式", "视觉理解"],
  },
  {
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    category: "text",
    contextLength: "200K",
    inputPrice: "$3.00",
    outputPrice: "$15.00",
    features: ["长文本", "多语言", "代码生成"],
  },
  {
    name: "Claude 3 Opus",
    provider: "Anthropic",
    category: "text",
    contextLength: "200K",
    inputPrice: "$15.00",
    outputPrice: "$75.00",
    features: ["长文本", "多语言", "代码生成"],
  },
  {
    name: "Gemini Pro",
    provider: "Google",
    category: "text",
    contextLength: "32K",
    inputPrice: "$0.50",
    outputPrice: "$1.50",
    features: ["多模态", "实时搜索", "高性价比"],
  },
  {
    name: "Llama 3.1 405B",
    provider: "Meta",
    category: "text",
    contextLength: "128K",
    inputPrice: "$3.00",
    outputPrice: "$3.00",
    features: ["开源", "自托管", "高性能"],
  },
  {
    name: "DALL·E 3",
    provider: "OpenAI",
    category: "image",
    contextLength: "-",
    inputPrice: "$0.04",
    outputPrice: "/图",
    features: ["高清", "风格控制", "文字渲染"],
  },
  {
    name: "Stable Diffusion XL",
    provider: "Stability",
    category: "image",
    contextLength: "-",
    inputPrice: "$0.002",
    outputPrice: "/图",
    features: ["开源", "LoRA", "ControlNet"],
  },
]

export function Models() {
  const [activeCategory, setActiveCategory] = useState("all")

  const filteredModels =
    activeCategory === "all"
      ? models
      : models.filter((model) => model.category === activeCategory)

  return (
    <section 
      id="models" 
      className="border-t py-24"
      style={{
        borderColor: 'var(--color-border-default)',
        paddingTop: 'var(--layout-section-spacing)',
        paddingBottom: 'var(--layout-section-spacing)',
      }}
    >
      <div 
        className="mx-auto px-6"
      >
        {/* Section Header */}
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <h2 
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
              }}
            >
              支持的 AI 模型
            </h2>
            <p 
              style={{
                marginTop: 'var(--space-2)',
                fontSize: '16px',
                color: 'var(--color-text-body)',
              }}
            >
              访问 50+ 全球顶尖 AI 模型，统一 API 格式，智能路由选择
            </p>
          </div>
          <Link href="/login">
            <Button 
              variant="outline" 
              className="gap-2"
              style={{
                borderColor: 'var(--color-button-secondary-border)',
                color: 'var(--color-button-secondary-text)',
              }}
            >
              查看全部模型
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 flex flex-wrap gap-2">
          {modelCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className="rounded-full px-4 py-1.5 text-sm transition-colors"
              style={{
                backgroundColor: activeCategory === category.id
                  ? 'var(--color-bg-muted)'
                  : 'transparent',
                color: activeCategory === category.id
                  ? 'var(--color-text-primary)'
                  : 'var(--color-text-body)',
                border: '1px solid',
                borderColor: activeCategory === category.id
                  ? 'var(--color-border-default)'
                  : 'transparent',
                transition: 'all var(--motion-base) var(--ease-standard)',
              }}
            >
              {category.label}
            </button>
          ))}
        </div>

        {/* Models Grid */}
        <div 
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          style={{ marginTop: 'var(--space-6)' }}
        >
          {filteredModels.map((model) => (
            <div
              key={model.name}
              className="ds-card cursor-pointer"
              style={{
                padding: 'var(--space-5)',
              }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 
                    style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {model.name}
                  </h3>
                  <p 
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-text-body)',
                      marginTop: 'var(--space-1)',
                    }}
                  >
                    {model.provider}
                  </p>
                </div>
                <span 
                  className="rounded px-2 py-0.5 text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg-muted)',
                    color: 'var(--color-text-body)',
                  }}
                >
                  {model.contextLength}
                </span>
              </div>

              <div 
                className="mt-4 flex items-baseline gap-1"
                style={{ marginTop: 'var(--space-4)' }}
              >
                <span 
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {model.inputPrice}
                </span>
                <span 
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-text-body)',
                  }}
                >
                  {model.outputPrice.startsWith("/")
                    ? model.outputPrice
                    : `/ ${model.outputPrice}`}
                </span>
              </div>

              <div 
                className="mt-4 flex flex-wrap gap-2"
                style={{ marginTop: 'var(--space-4)' }}
              >
                {model.features.map((feature) => (
                  <span
                    key={feature}
                    className="inline-flex items-center gap-1 text-xs"
                    style={{ color: 'var(--color-text-body)' }}
                  >
                    <Check className="h-3 w-3" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
