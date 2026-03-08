# 8-官网开发设计规范

## **Design System & Frontend Standards**

---

# **一、设计理念（Design Philosophy）**

### **🎯 核心原则**

**Minimal · Professional · Scalable · Intelligent**

### **我们的视觉目标：**

- 极简现代
- 企业级专业感
- 国际科技公司风格
- 信息清晰优先
- 长时间阅读舒适

---

# **二、配色规范（Color System）**

## **🎨 1. 基础中性色（Primary Neutrals）**

### **背景色**

```
#F6F6F7   页面背景（默认）
#FFFFFF   卡片背景
```

### **文字颜色**

```
#0A0A0A   主标题
#333333   副标题
#666666   正文说明
#9A9A9A   辅助文字
```

### **边框 & 分割线**

```
#E6E6E6
#EAEAEA
```

👉 所有边框应保持低对比度。

---

## **🎨 2. 强调色（Accent Colors）**

用于交互、链接、焦点元素：

### **推荐品牌科技色（可选其一）**

```
#7C7CFF   AI紫（推荐）
#3B82F6   科技蓝
#00C853   智能绿
```

⚠ 不允许多强调色混用。

---

## **🎨 3. 按钮颜色**

### **主按钮**

```
背景：#000000
文字：#FFFFFF
```

Hover：

```
#222222
```

### **次按钮（outline）**

```
边框：#111111
背景：透明
```

---

# **三、字体规范（Typography）**

## **推荐字体**

### **英文**

👉 **Inter**（首选）

👉 system-ui（fallback）

### **中文**

👉 思源黑体（Noto Sans SC）

👉 PingFang SC

---

## **字重层级**

| **层级** | **字重** | **用途** |
| --- | --- | --- |
| Hero | 600–700 | 首页大标题 |
| H1 | 600 | 模块标题 |
| H2 | 600 | 小节标题 |
| Body | 400 | 正文 |
| Caption | 400 | 辅助说明 |

---

## **字号层级建议**

### **Hero 标题**

```
48–64px
```

### **页面标题**

```
32–40px
```

### **模块标题**

```
20–24px
```

### **正文**

```
16px
```

### **辅助文字**

```
13–14px
```

---

# **四、布局规范（Layout & Spacing）**

## **内容宽度**

```
max-width: 1200px
```

大屏可扩展至 1280px。

---

## **页面留白**

### **模块间距**

```
80px（桌面）
48px（移动）
```

### **卡片间距**

```
16–24px
```

👉 留白是高级感的核心。

---

# **五、卡片设计规范（Card System）**

## **卡片样式**

✔ 白色背景

✔ 轻边框

✔ 大圆角

✔ 无重阴影

### **标准样式**

```
background: #ffffff;
border: 1px solid #e6e6e6;
border-radius: 24px;
```

Hover：

```
border-color: #d0d0d0;
```

---

# **六、按钮设计规范（Button System）**

## **主按钮**

特点：

✔ 圆角胶囊

✔ 高对比

✔ 视觉焦点

```
border-radius: 9999px;
padding: 14px 28px;
font-weight: 500;
```

---

# **七、交互动效规范（Motion & Interaction）**

## **动效原则**

✔ 快速

✔ 克制

✔ 平滑

✔ 不干扰阅读

---

## **Hover 动效**

允许：

✔ 轻微背景变化

✔ 轻微缩放（1.02）

✔ 边框加深

不允许：

❌ 夸张动画

❌ 弹跳效果

---

## **过渡时间**

```
0.2s – 0.3s
```

---

# **八、组件风格规范（Component Style）**

### **输入框**

✔ 圆角 12–16px

✔ 轻边框

✔ 无阴影

---

### **标签（Tag）**

```
background: #f3f3f4;
border-radius: 9999px;
```

---

### **分割线**

```
height: 1px;
background: #e6e6e6;
```

---

# **九、图标规范（Icons）**

## **推荐图标库**

👉 Lucide React

👉 Feather Icons

特点：

✔ 线性风格

✔ 统一视觉

✔ 轻量现代

---

# **十、开发技术规范（Frontend Standards）**

## **推荐技术栈**

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lucide Icons
- Framer Motion（动效）
- GSAP（复杂动画）

---

## **Tailwind 设计原则**

✔ 优先使用 utility classes

✔ 避免内联样式

✔ 避免过度自定义CSS

---

# **十一、视觉风格关键词（Brand Style Keywords）**

用于设计与AI生成：

**Minimal**

**Modern**

**Professional**

**Clean**

**Enterprise-grade**

**AI-native**

---

# **十二、禁止事项（Anti-Patterns）**

❌ 渐变背景泛滥

❌ 多色系混用

❌ 重阴影设计

❌ 复杂装饰元素

❌ 过度动画

---

# **⭐ 设计规范总结**

👉 极简中性色基调

👉 通过排版与留白建立高级感

👉 单一强调色增强科技感

👉 企业级清晰结构

👉 以信息表达为核心

---

# **🌐 Dr.Seek Design Tokens（V1.0）**

适用于：

✅ 官网

✅ SaaS 平台

✅ AI 产品

✅ 移动端

✅ 设计系统

---

# **一、Color Tokens（颜色令牌）**

## **🎨 Neutral 基础色**

### **背景**

```
--color-bg-page: #F6F6F7;
--color-bg-surface: #FFFFFF;
--color-bg-muted: #F3F3F4;
```

### **文本颜色**

```
--color-text-primary: #0A0A0A;
--color-text-secondary: #333333;
--color-text-body: #666666;
--color-text-muted: #9A9A9A;
```

### **边框 & 分割线**

```
--color-border-default: #E6E6E6;
--color-border-subtle: #EFEFEF;
```

---

## **🎨 Accent 强调色**

👉 默认推荐 AI 紫：

```
--color-accent-primary: #7C7CFF;
--color-accent-hover: #6B6BFF;
--color-accent-soft: #F1F1FF;
```

👉 可选品牌科技蓝：

```
--color-accent-blue: #3B82F6;
```

👉 可选智能绿：

```
--color-accent-green: #00C853;
```

⚠ 页面最多使用一个强调色。

---

## **🎨 按钮颜色**

```
--color-button-primary-bg: #000000;
--color-button-primary-hover: #222222;
--color-button-primary-text: #FFFFFF;
```

---

# **二、Typography Tokens（字体令牌）**

## **字体族**

```
--font-family-sans: Inter, system-ui, -apple-system, sans-serif;
--font-family-cn: "PingFang SC", "Noto Sans SC", sans-serif;
```

---

## **字号体系**

```
--font-size-hero: 56px;
--font-size-h1: 40px;
--font-size-h2: 28px;
--font-size-h3: 22px;
--font-size-body: 16px;
--font-size-small: 14px;
--font-size-caption: 13px;
```

---

## **字重**

```
--font-weight-bold: 700;
--font-weight-semibold: 600;
--font-weight-regular: 400;
```

---

# **三、Spacing Tokens（间距系统）**

👉 基于 8px 体系（行业标准）

```
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 80px;
```

---

# **四、Radius Tokens（圆角系统）**

```
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 24px;
--radius-pill: 9999px;
```

---

# **五、Shadow Tokens（阴影）**

👉 极简设计中阴影要克制

```
--shadow-soft: 0 2px 8px rgba(0,0,0,0.05);
--shadow-card-hover: 0 4px 14px rgba(0,0,0,0.08);
```

⚠ 默认不使用强阴影。

---

# **六、Border Tokens（边框）**

```
--border-default: 1px solid var(--color-border-default);
--border-subtle: 1px solid var(--color-border-subtle);
```

---

# **七、Motion Tokens（动效）**

## **过渡时间**

```
--motion-fast: 0.15s;
--motion-base: 0.25s;
--motion-slow: 0.4s;
```

## **缓动曲线**

```
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
```

---

# **八、Layout Tokens（布局）**

```
--layout-max-width: 1200px;
--layout-padding-x: 24px;
--layout-section-spacing: 80px;
```

---

# **九、组件示例（使用 Tokens）**

## **卡片**

```
.card {
  background: var(--color-bg-surface);
  border: var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  transition: var(--motion-base);
}

.card:hover {
  border-color: #d0d0d0;
}
```

---

## **主按钮**

```
.btn-primary {
  background: var(--color-button-primary-bg);
  color: var(--color-button-primary-text);
  border-radius: var(--radius-pill);
  padding: 14px 28px;
  transition: var(--motion-base);
}

.btn-primary:hover {
  background: var(--color-button-primary-hover);
}
```

---

# **十、Tailwind 集成方式（推荐）**

在 tailwind.config.ts 中：

```
theme: {
  extend: {
    colors: {
      primary: "#7C7CFF",
      border: "#E6E6E6",
      text: "#0A0A0A",
      muted: "#666666",
      bg: "#F6F6F7",
    }
  }
}
```

---

# **⭐ 为什么 Design Tokens 很重要？**

✔ 统一视觉风格

✔ 提高开发效率

✔ 支持主题切换

✔ 支持多产品统一

✔ 支持品牌升级

✔ 支持暗黑模式

👉 企业级产品必备。

---

**Dr.Seek Design Tokens（V1.1）暗黑模式完整方案**：

包含 ✅ Light / Dark 两套变量、✅ Tailwind 接入方式、✅ Next.js 根布局用法、✅ 组件使用示例（卡片/按钮/输入框）。

---

## **1) CSS Tokens：Light + Dark（推荐放**

## **app/globals.css**

## **）**

```
/* =========================
   Dr.Seek Design Tokens v1.1
   Light + Dark Theme
   ========================= */

:root {
  /* ---------- Neutrals: Background ---------- */
  --color-bg-page: #f6f6f7;        /* page background */
  --color-bg-surface: #ffffff;     /* cards, surfaces */
  --color-bg-muted: #f3f3f4;       /* subtle blocks */

  /* ---------- Neutrals: Text ---------- */
  --color-text-primary: #0a0a0a;
  --color-text-secondary: #333333;
  --color-text-body: #666666;
  --color-text-muted: #9a9a9a;

  /* ---------- Borders & Lines ---------- */
  --color-border-default: #e6e6e6;
  --color-border-subtle: #efefef;

  /* ---------- Accent (single accent recommended) ---------- */
  --color-accent-primary: #7c7cff; /* AI purple */
  --color-accent-hover: #6b6bff;
  --color-accent-soft: #f1f1ff;

  /* ---------- Buttons ---------- */
  --color-button-primary-bg: #000000;
  --color-button-primary-hover: #222222;
  --color-button-primary-text: #ffffff;

  --color-button-secondary-bg: transparent;
  --color-button-secondary-text: #0a0a0a;
  --color-button-secondary-border: #111111;

  /* ---------- Focus Ring ---------- */
  --color-focus-ring: rgba(124, 124, 255, 0.35);

  /* ---------- Typography ---------- */
  --font-family-sans: Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif;
  --font-family-cn: "PingFang SC", "Noto Sans SC", system-ui, sans-serif;

  /* ---------- Spacing (8px scale) ---------- */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --space-8: 64px;
  --space-9: 80px;

  /* ---------- Radius ---------- */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 9999px;

  /* ---------- Shadows (subtle) ---------- */
  --shadow-soft: 0 2px 8px rgba(0,0,0,0.05);
  --shadow-card-hover: 0 6px 18px rgba(0,0,0,0.08);

  /* ---------- Motion ---------- */
  --motion-fast: 0.15s;
  --motion-base: 0.25s;
  --motion-slow: 0.4s;
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* ---------- Layout ---------- */
  --layout-max-width: 1200px;
  --layout-padding-x: 24px;
  --layout-section-spacing: 80px;
}

/* Dark theme via class strategy (recommended for Next.js) */
:root.dark {
  /* Backgrounds */
  --color-bg-page: #070a10;        /* near-black */
  --color-bg-surface: #0b1020;     /* card surface */
  --color-bg-muted: #0f172a;       /* subtle blocks */

  /* Text */
  --color-text-primary: rgba(255,255,255,0.92);
  --color-text-secondary: rgba(255,255,255,0.78);
  --color-text-body: rgba(255,255,255,0.65);
  --color-text-muted: rgba(255,255,255,0.45);

  /* Borders */
  --color-border-default: rgba(255,255,255,0.12);
  --color-border-subtle: rgba(255,255,255,0.08);

  /* Accent */
  --color-accent-primary: #7c7cff;
  --color-accent-hover: #9a92ff;
  --color-accent-soft: rgba(124,124,255,0.14);

  /* Buttons */
  --color-button-primary-bg: #ffffff;
  --color-button-primary-hover: rgba(255,255,255,0.90);
  --color-button-primary-text: #0a0a0a;

  --color-button-secondary-bg: transparent;
  --color-button-secondary-text: rgba(255,255,255,0.92);
  --color-button-secondary-border: rgba(255,255,255,0.22);

  /* Focus ring */
  --color-focus-ring: rgba(124, 124, 255, 0.45);

  /* Shadows (still subtle) */
  --shadow-soft: 0 2px 12px rgba(0,0,0,0.45);
  --shadow-card-hover: 0 10px 28px rgba(0,0,0,0.50);
}

/* Base body usage */
html, body {
  font-family: var(--font-family-sans);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

/* Optional: utility classes using tokens */
.ds-card {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-xl);
  padding: var(--space-5);
  transition: transform var(--motion-base) var(--ease-standard),
              border-color var(--motion-base) var(--ease-standard),
              box-shadow var(--motion-base) var(--ease-standard);
}
.ds-card:hover {
  box-shadow: var(--shadow-card-hover);
  transform: translateY(-1px);
}

.ds-btn-primary {
  background: var(--color-button-primary-bg);
  color: var(--color-button-primary-text);
  border-radius: var(--radius-pill);
  padding: 14px 28px;
  font-weight: 600;
  transition: background var(--motion-base) var(--ease-standard),
              transform var(--motion-base) var(--ease-standard);
}
.ds-btn-primary:hover { background: var(--color-button-primary-hover); }
.ds-btn-primary:active { transform: scale(0.99); }
.ds-btn-primary:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}

.ds-input {
  background: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
  transition: border-color var(--motion-base) var(--ease-standard),
              box-shadow var(--motion-base) var(--ease-standard);
}
.ds-input:focus {
  outline: 0;
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 4px var(--color-focus-ring);
}
```

---

## **2) Next.js 里怎么启用暗黑模式（最简单可控版）**

### **app/layout.tsx**

### **（示例：默认暗黑）**

```
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

想默认亮色就去掉 className="dark"。

---

## **3) 加一个切换按钮（不依赖任何库）**

> 放到任意 Client Component 里即可
> 

```
"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  return (
    <button className="ds-btn-primary" onClick={() => setIsDark((v) => !v)}>
      {isDark ? "Switch to Light" : "Switch to Dark"}
    </button>
  );
}
```

---

## **4) 页面快速预览（卡片 + 输入框 + 按钮）**

```
"use client";

import { ThemeToggle } from "@/components/ThemeToggle";

export default function Demo() {
  return (
    <div style={{ maxWidth: "var(--layout-max-width)", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <h1 style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em" }}>
          Dr.Seek UI Tokens
        </h1>
        <ThemeToggle />
      </div>

      <div style={{ marginTop: 24 }} className="ds-card">
        <div style={{ fontSize: 14, color: "var(--color-text-muted)" }}>Search</div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          <input className="ds-input" placeholder="Search by keyword…" style={{ flex: 1, minWidth: 240 }} />
          <button className="ds-btn-primary">Get started</button>
        </div>
      </div>
    </div>
  );
}
```

---

## **5) 使用规则（团队统一口径）**

- **主题切换用 :root.dark**（class strategy），不搞多个方案混用
- 页面背景统一用 --color-bg-page，卡片统一用 --color-bg-surface
- 全站只允许 **一个 Accent（默认 AI 紫 #7C7CFF）**
- 阴影只用 tokens（克制），不允许组件各写各的重阴影
- Focus ring 必须可见（无障碍 + 高级感）

---