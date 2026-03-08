import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function CTA() {
  return (
    <section 
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
        <div 
          className="relative overflow-hidden rounded-2xl border px-8 py-16 text-center sm:px-16"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-9) var(--space-7)',
          }}
        >
          <div className="relative">
            <h2 
              style={{
                fontSize: 'clamp(28px, 5vw, 40px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: 'var(--color-text-primary)',
                marginBottom: 'var(--space-4)',
                maxWidth: '600px',
                margin: '0 auto var(--space-4)',
              }}
            >
              准备好开始了吗？
            </h2>
            <p 
              style={{
                fontSize: '18px',
                color: 'var(--color-text-body)',
                maxWidth: '500px',
                margin: '0 auto',
              }}
            >
              免费注册，立即获得 $5 额度。无需信用卡，随时取消。
            </p>
            <div 
              className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row"
              style={{ marginTop: 'var(--space-6)' }}
            >
              <Link href="/login">
                <Button 
                  size="lg" 
                  className="ds-btn-primary"
                  style={{
                    height: '48px',
                    padding: '14px 28px',
                  }}
                >
                  免费开始使用
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                style={{
                  height: '48px',
                  padding: '14px 28px',
                  borderColor: 'var(--color-button-secondary-border)',
                  color: 'var(--color-button-secondary-text)',
                }}
              >
                查看文档
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
