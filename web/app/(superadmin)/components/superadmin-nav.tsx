"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Layers, DollarSign, Activity, Gift } from "lucide-react"

const navItems = [
  { href: "/superadmin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/status", label: "模型状态", icon: Activity },
  { href: "/superadmin/providers", label: "供应商管理", icon: Layers },
  { href: "/superadmin/pricing", label: "配置价格", icon: DollarSign },
  { href: "/superadmin/invite-rewards", label: "邀请奖励设置", icon: Gift },
]

export function SuperadminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit mb-6">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          item.href === "/superadmin"
            ? pathname === "/superadmin"
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
