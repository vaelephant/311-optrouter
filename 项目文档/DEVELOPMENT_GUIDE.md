# 4-开发规范-**Next.js App Router 模块化开发规范**

📘 **Next.js App Router 团队开发规范（企业级版 · 终稿）**

适用于：**中大型 Web 应用 / SaaS / 平台型产品**

技术栈：**Next.js 16+ / App Router / TypeScript / Server Actions / shadcn/ui**

---

## **一、总体设计原则（团队共识）**

### **🎯 核心目标**

1. **模块可独立演进**
    
    任一功能模块可独立开发、重构、下线，不影响其他模块。
    
2. **代码可长期维护**
    
    6–12 个月后回看代码，结构依然清晰、职责明确。
    
3. **职责边界清晰**
    
    UI ≠ 业务逻辑 ≠ 数据访问，严格分层。
    
4. **对新人友好**
    
    通过规范而非“口口相传”完成知识传递。
    
    5、低耦合适合整体迁移
    

---

## **二、核心架构约束（强制执行）**

> ❗ 以下为
> 
> 
> **强制性约束**
> 
> **禁止合并 PR**
> 

### **❌ 禁止行为**

1. **禁止跨路由组直接依赖 UI**
    - (chat) 不得 import (dashboard) 下的组件
2. **禁止在 Client Component 中访问**
    - 数据库
    - process.env
    - 业务 Service / Domain
3. **禁止在 Proxy 中**
    - 查询数据库
    - 进行权限/角色计算
    - 获取用户完整信息
4. **业务逻辑只能存在于 Domain 层**
    - Action / API / Page 中不得编写业务规则

---

## **三、目录结构规范（团队统一）**

```
src/
├── proxy.ts                      # 路由级 Proxy（认证 / 重定向）
├── next.config.ts
├── package.json
│
├── app/                          # App Router
│   ├── layout.tsx                # 根布局
│   ├── globals.css
│
│   ├── (module-name)/            # 功能模块（Route Group）
│   │   ├── layout.tsx            # 模块布局
│   │   ├── page.tsx              # 模块首页
│   │   ├── actions.ts            # Server Actions（只做参数 → domain）
│   │   ├── api/                  # API Routes
│   │   ├── components/           # 模块私有 UI
│   │   ├── domain/               # ⭐ 业务核心（强制）
│   │   │   ├── *.service.ts      # 业务编排
│   │   │   ├── *.repo.ts         # DB / 外部 API
│   │   │   ├── *.schema.ts       # Zod 校验
│   │   │   └── *.types.ts        # 类型定义
│   │   └── error.tsx             # 模块级错误边界
│
├── components/                   # 全局共享 UI
│   ├── ui/                       # shadcn/ui 原子组件
│   └── common/                   # 通用业务组件
│
├── lib/                          # 跨模块能力
│   ├── db/                       # 数据库
│   ├── auth/                     # 认证
│   ├── http/                     # HTTP 工具
│   ├── actions/                  # Action 通用类型
│   ├── modules/                  # 模块对外暴露 API
│   └── features.ts               # Feature Flags
│
└── tests/
    ├── e2e/
    └── unit/
```

---

## **四、Domain 层规范（最重要）**

### **🧠 定义**

**Domain = 业务事实的唯一来源**

### **📌 职责划分**

| **文件** | **职责** |
| --- | --- |
| *.service.ts | 业务流程与规则编排 |
| *.repo.ts | 数据库 / 外部 API |
| *.schema.ts | Zod 输入校验 |
| *.types.ts | 领域类型定义 |

### **❌ Domain 层禁止**

- React / JSX
- Request / Response
- cookies / headers
- Next.js 专有 API

---

## **四-1、Prisma 命名规范（强制）**

### **模型命名**
- ✅ 使用 PascalCase：`User`, `Strategy`, `InviteCode`
- ✅ 使用 `@@map` 映射数据库表名：`@@map("users")`
- ❌ 禁止直接使用 snake_case 作为模型名

### **字段命名**
- ✅ 使用 camelCase：`userId`, `inviterId`, `isActive`
- ✅ 使用 `@map` 映射数据库列名：`userId String @map("user_id")`
- ❌ 禁止在代码中使用 snake_case 字段名

### **关系字段命名**
- ✅ 使用 camelCase：`user`, `strategy`, `rewardRule`
- ✅ 单数形式（一对一、多对一）：`user`, `strategy`
- ✅ 复数形式（一对多）：`users`, `strategies`

### **修改 Schema 后必须执行**
```bash
npm run db:generate  # 重新生成 Prisma Client
```

---

## **五、Server Actions 规范（强制）**

### **Server Action 只允许做三件事**

1. 读取参数（FormData / arguments）
2. 调用 Domain Service
3. 返回统一结果结构

### **统一返回结构**

```
// lib/actions/types.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

### **示例**

```
"use server";

import { createChat } from "./domain/chat.service";
import type { ActionResult } from "@/lib/actions/types";

export async function createChatAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    const id = await createChat(formData);
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, error: "Create failed" };
  }
}
```

---

## **六、API Route 规范**

### **API 使用场景**

- 外部系统调用
- WebSocket / SSE
- 文件上传
- 流式响应

### **HTTP 语义规范（强制）**

| **场景** | **状态码** |
| --- | --- |
| 参数错误 | 400 |
| 未登录 | 401 |
| 无权限 | 403 |
| 不存在 | 404 |
| 冲突 | 409 |
| 成功 | 200 / 201 |

### **推荐工具函数**

```
// lib/http.ts
import { NextResponse } from "next/server";

export const ok = (data: unknown) =>
  NextResponse.json(data, { status: 200 });

export const badRequest = (msg = "Bad Request") =>
  NextResponse.json({ error: msg }, { status: 400 });
```

---

## **七、Proxy（路由中间件）团队共识**

### **定位**

**Proxy = 快速路由判断，不是业务层**

### **✅ 允许**

- JWT 是否存在
- JWT 是否过期
- 路由级重定向

### **❌ 严禁**

- 查数据库
- 判断角色 / 权限
- 获取用户完整信息

---

## **八、模块间通信规范（强制）**

### **❌ 禁止**

```
import { xxx } from "../(other-module)/actions";
```

### **✅ 正确方式**

```
// lib/modules/chat.ts
export * from "@/app/(chat)/domain/chat.service";
```

```
import { createChat } from "@/lib/modules/chat";
```

> 原则：
> 
> 
> **app 目录不是公共 API，lib 才是**
> 

---

## **九、组件规范（前端必须遵守）**

### **组件分级**

| **位置** | **作用** |
| --- | --- |
| app/(module)/components | 模块私有 |
| components/ui | 原子 UI |
| components/common | 通用业务组件 |

### **Client Component 规则**

- "use client" 必须写在第一行
- 不允许包含业务逻辑
- 不允许访问 Domain / Repo

---

## **十、Feature Flag（推荐）**

```
// lib/features.ts
export const features = {
  chatStream: true,
  backtestV2: false,
};
```

用途：

- 灰度发布
- A/B 测试
- 模块快速下线

---

## **十一、错误处理规范**

```
app/error.tsx                # 全局兜底
app/(module)/error.tsx       # 模块级错误
```

**优先级：模块级 > 全局兜底**

---

## **十二、测试规范**

```
tests/
├── e2e/        # 端到端测试
└── unit/       # 单元测试
```

- 命名：*.test.ts / *.spec.ts

---

## **十三、代码 Review 核心检查清单（PR 必查）**

- 是否违反模块边界
- 是否在 Client 写业务逻辑
- 是否缺失 Domain 层
- 是否 Action 过重
- 是否 Proxy 承担了业务职责
- **Prisma 模型/字段是否使用 camelCase + @map**
- **修改 schema 后是否重新生成了 Prisma Client**

---

## **📌 最终共识**

> 写代码不是为了“现在能跑”，
> 

> 而是为了“半年后还能安全地改”。
> 

**本规范为团队最高工程约束，所有成员必须遵守。**