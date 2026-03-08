"use client"

import { Bell, Search, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export function TopBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">概览</h1>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
          Pro 方案
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <Search className="size-3.5" />
          <span className="hidden sm:inline">搜索</span>
          <kbd className="pointer-events-none ml-1 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
            <span className="text-[10px]">{"/"}</span>
          </kbd>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">API 文档</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="relative size-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Bell className="size-4" />
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary" />
        </Button>
      </div>
    </header>
  )
}
