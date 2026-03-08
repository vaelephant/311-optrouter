import { Zap, Shield, Globe, Code, BarChart3, Route } from "lucide-react"

const features = [
  {
    icon: Route,
    title: "智能路由",
    description: "自动选择最优模型，支持 fallback 自动切换。根据延迟、成本或性能智能路由，确保服务高可用。",
  },
  {
    icon: Code,
    title: "OpenAI 兼容",
    description: "完全兼容 OpenAI API 格式，一行代码切换。支持所有 OpenAI SDK、LangChain、LlamaIndex 等框架。",
  },
  {
    icon: Globe,
    title: "统一接口",
    description: "一个 API 访问 OpenAI、Anthropic、Google、Meta 等 50+ 顶尖 AI 模型，无需管理多个密钥。",
  },
  {
    icon: Zap,
    title: "高性能网关",
    description: "基于 Rust 的高性能网关，支持流式响应、高并发代理。平均延迟低于 50ms，确保快速响应。",
  },
  {
    icon: BarChart3,
    title: "统一计费",
    description: "详细的用量统计、成本分析和性能指标。统一账单管理，让您对 AI 支出了如指掌。",
  },
  {
    icon: Shield,
    title: "企业级安全",
    description: "API Key 管理、权限控制、数据隔离。满足企业级安全要求，支持私有部署。",
  },
]

export function Features() {
  return (
    <section 
      id="features" 
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
        <div className="mx-auto max-w-2xl text-center">
          <h2 
            style={{
              fontSize: 'clamp(28px, 5vw, 40px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            为什么选择 OptRouter
          </h2>
          <p 
            style={{
              fontSize: '18px',
              lineHeight: '1.6',
              color: 'var(--color-text-body)',
              marginTop: 'var(--space-4)',
            }}
          >
            AI 模型的统一入口，让您专注于产品创新，无需管理复杂的模型接入
          </p>
        </div>

        {/* Features Grid */}
        <div 
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          style={{
            marginTop: 'var(--space-8)',
            gap: 'var(--space-5)',
          }}
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="ds-card group"
              style={{
                padding: 'var(--space-6)',
              }}
            >
              <div 
                className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'var(--color-bg-muted)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {feature.title}
              </h3>
              <p 
                style={{
                  fontSize: '14px',
                  lineHeight: '1.6',
                  color: 'var(--color-text-body)',
                  marginTop: 'var(--space-2)',
                }}
              >
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
