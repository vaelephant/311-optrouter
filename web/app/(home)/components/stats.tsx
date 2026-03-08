const stats = [
  { value: "50+", label: "AI 模型" },
  { value: "10B+", label: "API 调用/月" },
  { value: "99.99%", label: "服务可用性" },
  { value: "< 50ms", label: "平均延迟" },
]

export function Stats() {
  return (
    <section 
      className="border-t py-16"
      style={{
        borderColor: 'var(--color-border-default)',
        paddingTop: 'var(--space-7)',
        paddingBottom: 'var(--space-7)',
      }}
    >
      <div 
        className="mx-auto px-6"
      >
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div 
                style={{
                  fontSize: 'clamp(32px, 5vw, 48px)',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: 'var(--color-text-primary)',
                  lineHeight: '1.2',
                }}
              >
                {stat.value}
              </div>
              <div 
                style={{
                  marginTop: 'var(--space-2)',
                  fontSize: '14px',
                  color: 'var(--color-text-body)',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
