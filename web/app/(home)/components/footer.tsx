"use client"

import Link from "next/link"

export function Footer() {
  return (
    <footer 
      className="border-t"
      style={{
        borderColor: 'var(--color-border-default)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      <div 
        className="mx-auto px-6 py-12"
        style={{ 
          maxWidth: 'var(--layout-max-width)',
          paddingTop: 'var(--space-7)',
          paddingBottom: 'var(--space-7)',
        }}
      >
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Link 
            href="/" 
            style={{
              textDecoration: 'none',
              color: 'var(--color-text-primary)',
              fontWeight: 600,
              fontSize: '18px',
            }}
          >
            OptRouter
          </Link>
          
          <div 
            className="flex gap-6"
            style={{ color: 'var(--color-text-body)' }}
          >
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>定价</Link>
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>文档</Link>
            <Link href="#" style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>隐私</Link>
          </div>
          
          <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
            © 2024 OptRouter
          </p>
        </div>
      </div>
    </footer>
  )
}
