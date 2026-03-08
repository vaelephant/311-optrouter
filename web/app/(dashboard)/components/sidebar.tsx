"use client"

import { useEffect, useMemo, useState } from "react"
import {
  LayoutDashboard,
  Key,
  BarChart3,
  Settings,
  CreditCard,
  BookOpen,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Layers,
  Users,
  Wallet,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { clearUserAuth, getCurrentUserEmail, getCurrentUserId } from "@/lib/auth-client"

const userNavItems = [
  { icon: LayoutDashboard, label: "概览", id: "overview", href: "/dashboard" },
  { icon: Zap, label: "模型", id: "models", href: "/models" },
  { icon: Key, label: "API 密钥", id: "keys", href: "/keys" },
  { icon: Users, label: "邀请好友", id: "invite", href: "/invite" },
  { icon: BarChart3, label: "用量分析", id: "analytics", href: "/analytics" },
  { icon: Wallet, label: "充值", id: "recharge", href: "/recharge" },
  { icon: CreditCard, label: "账单", id: "billing", href: "/billing" },
  { icon: BookOpen, label: "文档", id: "docs", href: "/docs" },
  { icon: Settings, label: "设置", id: "settings", href: "/settings" },
  { icon: ShieldCheck, label: "模型管理", id: "superadmin", href: "/superadmin" },
]

// 超级管理员在模型管理内时只显示：返回用户端、模型管理（不显示用户端菜单）
const superadminNavItems = [
  { icon: LayoutDashboard, label: "返回用户端", id: "overview", href: "/dashboard" },
  { icon: ShieldCheck, label: "模型管理", id: "superadmin", href: "/superadmin" },
]

interface PlanInfo {
  planName: string
  usedAmount: number
  totalAmount: number
  balance: number
}

export function DashboardSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [planLoading, setPlanLoading] = useState(true)

  useEffect(() => {
    setUserEmail(getCurrentUserEmail())
  }, [])

  useEffect(() => {
    async function fetchPlanInfo() {
      const userId = getCurrentUserId()
      if (!userId) {
        setPlanLoading(false)
        return
      }

      try {
        const response = await fetch('/api/plan', {
          headers: { 'x-user-id': userId },
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.data) {
            setPlanInfo(result.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch plan info:', error)
      } finally {
        setPlanLoading(false)
      }
    }

    fetchPlanInfo()
  }, [])

  const initials = useMemo(() => {
    const email = (userEmail || "").trim()
    if (!email) return "U"
    const head = email.split("@")[0] || email
    const letters = head.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
    return (letters.slice(0, 2) || "U").padEnd(2, "U")
  }, [userEmail])

  const activeItem = useMemo(() => {
    if (pathname === "/dashboard") return "overview"
    if (pathname === "/invite") return "invite"
    if (pathname === "/keys") return "keys"
    if (pathname.startsWith("/models")) return "models"
    if (pathname.startsWith("/analytics")) return "analytics"
    if (pathname.startsWith("/recharge")) return "recharge"
    if (pathname.startsWith("/billing")) return "billing"
    if (pathname.startsWith("/docs")) return "docs"
    if (pathname.startsWith("/settings")) return "settings"
    if (pathname.startsWith("/superadmin")) return "superadmin"
    return "overview"
  }, [pathname])

  const isSuperadminView = pathname.startsWith("/superadmin")
  const navItems = isSuperadminView ? superadminNavItems : userNavItems

  const handleLogout = () => {
    clearUserAuth()
    router.replace("/login")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Layers className="size-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">
              OptRouter
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => {
              const isActive = activeItem === item.id
              return (
                <li key={item.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-primary"
                            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                        )}
                      >
                        <item.icon className="size-4 shrink-0" />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Bottom */}
        <div className="border-t border-sidebar-border p-2">
          {/* Plan badge：仅在用户端显示 */}
          {!isSuperadminView && !collapsed && (
            <div className="mb-2 rounded-md bg-sidebar-accent px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">当前方案</span>
                {planLoading ? (
                  <div className="h-3 w-8 animate-pulse rounded bg-border" />
                ) : (
                  <Badge variant="secondary" className="text-[10px] bg-primary/15 text-primary border-0">
                    {planInfo?.planName || '免费'}
                  </Badge>
                )}
              </div>
              {planLoading ? (
                <>
                  <div className="mt-1 h-3 w-24 animate-pulse rounded bg-border" />
                  <div className="mt-1.5 h-1 rounded-full bg-border" />
                </>
              ) : planInfo && planInfo.totalAmount > 0 ? (
                <>
                  <p className="mt-1 text-xs text-sidebar-foreground font-medium">
                    ${planInfo.usedAmount.toFixed(2)} / ${planInfo.totalAmount.toFixed(2)}
                  </p>
                  <div className="mt-1.5 h-1 rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min((planInfo.usedAmount / planInfo.totalAmount) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-sidebar-foreground font-medium">
                    余额: ${planInfo?.balance.toFixed(2) || '0.00'}
                  </p>
                  <div className="mt-1.5 h-1 rounded-full bg-border">
                    <div className="h-full w-0 rounded-full bg-primary" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* User */}
          <div className="flex items-center gap-3 rounded-md px-3 py-2">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-sidebar-foreground">
                    {userEmail || "未登录"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {userEmail || "—"}
                  </p>
                </div>
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={handleLogout}
                  aria-label="退出登录"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-1 flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="size-4" />
            ) : (
              <ChevronLeft className="size-4" />
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
