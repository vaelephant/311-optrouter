"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { ThemeToggle } from "./theme-toggle"

const navLinks = [
  { href: "#models", label: "模型" },
  { href: "#features", label: "功能" },
  { href: "#pricing", label: "定价" },
  { href: "#docs", label: "文档" },
]

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        borderColor: 'var(--color-border-default)',
        backgroundColor: 'var(--color-bg-page)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <nav 
        className="mx-auto flex h-16 items-center justify-between px-6"
      >
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-2"
          style={{ 
            color: 'var(--color-text-primary)',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '18px',
            letterSpacing: '-0.02em',
          }}
        >
          <div 
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: 'var(--color-button-primary-bg)',
              color: 'var(--color-button-primary-text)',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700 }}>O</span>
          </div>
          <span>OptRouter</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors hover:text-foreground"
              style={{
                color: 'var(--color-text-body)',
                textDecoration: 'none',
                transition: 'color var(--motion-base) var(--ease-standard)',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button 
              variant="ghost" 
              size="sm"
              style={{
                color: 'var(--color-text-body)',
              }}
            >
              登录
            </Button>
          </Link>
          <Link href="/login">
            <Button 
              size="sm"
              className="ds-btn-primary px-4 py-2 text-xs"
            >
              开始使用
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              color: 'var(--color-text-primary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
            }}
            aria-label="菜单"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div 
          className="border-t md:hidden"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-surface)',
          }}
        >
          <div className="flex flex-col gap-4 p-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm transition-colors hover:text-foreground"
                style={{
                  color: 'var(--color-text-body)',
                  textDecoration: 'none',
                  transition: 'color var(--motion-base) var(--ease-standard)',
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3">
              <Link href="/login" className="w-full">
                <Button 
                  variant="outline" 
                  className="w-full"
                  style={{
                    borderColor: 'var(--color-button-secondary-border)',
                    color: 'var(--color-button-secondary-text)',
                  }}
                >
                  登录
                </Button>
              </Link>
              <Link href="/login" className="w-full">
                <Button 
                  className="w-full ds-btn-primary"
                >
                  开始使用
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
