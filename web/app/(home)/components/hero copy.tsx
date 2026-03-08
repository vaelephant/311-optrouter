"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Copy, Check } from "lucide-react"
import { useState } from "react"

export function Hero() {
  const [copied, setCopied] = useState(false)

  const copyCommand = () => {
    navigator.clipboard.writeText("curl https://api.optrouter.com/v1/chat/completions -H 'Authorization: Bearer YOUR_API_KEY' -d '{\"model\":\"gpt-4o\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}'")
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section 
      className="relative min-h-screen overflow-hidden pt-16"
      style={{
        paddingTop: 'var(--layout-section-spacing)',
        paddingBottom: 'var(--layout-section-spacing)',
      }}
    >
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, var(--color-accent-soft), transparent)',
        }}
      />

      <div 
        className="relative mx-auto flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center"
      >
        {/* Main Heading */}
        <h1 
          style={{
            fontSize: 'clamp(36px, 7vw, 56px)',
            fontWeight: 700,
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--space-5)',
            maxWidth: '800px',
          }}
        >
          <span style={{ color: 'var(--color-accent-primary)' }}>一个 API</span> 接入所有 AI 模型
        </h1>

        {/* Subtitle */}
        <p 
          style={{
            fontSize: '18px',
            lineHeight: '1.6',
            color: 'var(--color-text-body)',
            maxWidth: '560px',
            marginTop: 'var(--space-4)',
            marginBottom: 'var(--space-7)',
          }}
        >
          30 秒即可完成集成。
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/login">
            <Button 
              className="ds-btn-primary"
              style={{
                height: '48px',
                padding: '14px 28px',
                fontSize: '16px',
              }}
            >
              免费开始
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          
          <button
            onClick={copyCommand}
            className="flex h-12 items-center gap-3 rounded-full border px-5 text-sm transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-body)',
            }}
          >
            <span style={{ color: 'var(--color-accent-primary)' }}>$</span>
            <span className="hidden sm:inline">curl api.optrouter.com/v1</span>
            <span className="sm:hidden">查看 API</span>
            {copied ? (
              <Check className="h-4 w-4" style={{ color: 'var(--color-accent-primary)' }} />
            ) : (
              <Copy className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
            )}
          </button>
        </div>

        {/* Trust Badges */}
        <div 
          className="mt-16 flex flex-col items-center gap-5"
          style={{ marginTop: 'var(--space-8)' }}
        >
          <p style={{ 
            fontSize: '13px', 
            color: 'var(--color-text-muted)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            兼容所有主流 AI 框架
          </p>
          <div 
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4"
            style={{ opacity: 0.6 }}
          >
            {["OpenAI SDK", "LangChain", "LlamaIndex", "Vercel AI", "Next.js"].map((tech) => (
              <span 
                key={tech} 
                style={{
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                }}
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
