import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "免费版",
    description: "适合个人开发者和小型项目",
    price: "$0",
    period: "永久免费",
    features: [
      "每月 $5 免费额度",
      "所有模型访问权限",
      "社区支持",
      "基础用量统计",
      "API 速率限制 10 RPM",
    ],
    cta: "免费开始",
    popular: false,
  },
  {
    name: "专业版",
    description: "适合成长中的团队和产品",
    price: "$49",
    period: "/月",
    features: [
      "包含 $100 用量",
      "所有模型无限访问",
      "优先级支持",
      "高级分析仪表盘",
      "API 速率限制 100 RPM",
      "智能路由配置",
      "Webhook 集成",
    ],
    cta: "开始试用",
    popular: true,
  },
  {
    name: "企业版",
    description: "为大规模部署定制方案",
    price: "定制",
    period: "联系销售",
    features: [
      "无限用量",
      "专属客户经理",
      "99.99% SLA 保障",
      "私有部署选项",
      "自定义速率限制",
      "SSO 单点登录",
      "合规审计日志",
      "定制合同条款",
    ],
    cta: "联系销售",
    popular: false,
  },
]

export function Pricing() {
  return (
    <section 
      id="pricing" 
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
            简单透明的定价
          </h2>
          <p 
            style={{
              marginTop: 'var(--space-4)',
              fontSize: '18px',
              color: 'var(--color-text-body)',
            }}
          >
            按需付费，无隐藏费用。随时升级或降级
          </p>
        </div>

        {/* Pricing Cards */}
        <div 
          className="mt-16 grid gap-6 lg:grid-cols-3"
          style={{ marginTop: 'var(--space-8)' }}
        >
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="ds-card relative"
              style={{
                padding: 'var(--space-7)',
                borderColor: plan.popular 
                  ? 'var(--color-accent-primary)' 
                  : 'var(--color-border-default)',
                borderWidth: plan.popular ? '2px' : '1px',
              }}
            >
              {plan.popular && (
                <div 
                  className="absolute -top-3 left-1/2 -translate-x-1/2"
                  style={{
                    backgroundColor: 'var(--color-accent-primary)',
                    color: '#ffffff',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  最受欢迎
                </div>
              )}

              <div>
                <h3 
                  style={{
                    fontSize: '22px',
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {plan.name}
                </h3>
                <p 
                  style={{
                    marginTop: 'var(--space-1)',
                    fontSize: '14px',
                    color: 'var(--color-text-body)',
                  }}
                >
                  {plan.description}
                </p>
              </div>

              <div 
                className="mt-6 flex items-baseline gap-1"
                style={{ marginTop: 'var(--space-6)' }}
              >
                <span 
                  style={{
                    fontSize: '40px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {plan.price}
                </span>
                <span 
                  style={{
                    fontSize: '16px',
                    color: 'var(--color-text-body)',
                  }}
                >
                  {plan.period}
                </span>
              </div>

              <ul 
                className="mt-8 space-y-3"
                style={{ marginTop: 'var(--space-6)' }}
              >
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check 
                      className="mt-0.5 h-4 w-4 shrink-0" 
                      style={{ color: 'var(--color-text-body)' }}
                    />
                    <span 
                      style={{
                        fontSize: '14px',
                        color: 'var(--color-text-body)',
                      }}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href="/login" className="block mt-8">
                <Button
                  className={`w-full ${plan.popular ? 'ds-btn-primary' : ''}`}
                  variant={plan.popular ? "default" : "outline"}
                  style={{
                    marginTop: 'var(--space-6)',
                    ...(plan.popular ? {} : {
                      borderColor: 'var(--color-button-secondary-border)',
                      color: 'var(--color-button-secondary-text)',
                    }),
                  }}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ Link */}
        <p 
          className="mt-12 text-center text-sm"
          style={{
            marginTop: 'var(--space-7)',
            color: 'var(--color-text-body)',
          }}
        >
          有疑问？查看我们的{" "}
          <a 
            href="#" 
            style={{
              color: 'var(--color-accent-primary)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            常见问题
          </a>{" "}
          或{" "}
          <a 
            href="#" 
            style={{
              color: 'var(--color-accent-primary)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            联系我们
          </a>
        </p>
      </div>
    </section>
  )
}
