"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Check, Plus } from "lucide-react"
import { format } from "date-fns"

interface InviteCode {
  id: number
  code: string
  used_count: number
  max_uses: number | null
  remaining_uses: number | null
  is_expired: boolean
  is_used_up: boolean
  created_at: string | null
}

interface InviteCodeListProps {
  codes: InviteCode[]
  loading: boolean
  onGenerate: () => void
}

export function InviteCodeList({ codes, loading, onGenerate }: InviteCodeListProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const handleCopyCode = (code: string) => {
    const url = `${window.location.origin}/register?invite_code=${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>我的邀请码</CardTitle>
            <CardDescription>生成邀请码分享给好友</CardDescription>
          </div>
          <Button onClick={onGenerate} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            生成邀请码
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>还没有邀请码，点击上方按钮生成一个</p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => {
              const inviteUrl = `${window.location.origin}/register?invite_code=${code.code}`
              const isAvailable = !code.is_expired && !code.is_used_up
              const remainingText = code.remaining_uses === null ? '无限次' : `${code.remaining_uses}次`
              const createdDate = code.created_at ? format(new Date(code.created_at), 'yyyy-MM-dd') : ''
              
              return (
                <div
                  key={code.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  {/* 第一行：邀请码和状态 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="font-mono font-semibold text-lg">{code.code}</div>
                      {isAvailable && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-destructive text-destructive-foreground rounded">
                          可用
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* 第二行：使用统计和创建日期 */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div>
                      已使用: {code.used_count}
                      {code.max_uses !== null && `/${code.max_uses}`}
                      {' '}
                      剩余: {remainingText}
                    </div>
                    {createdDate && (
                      <div>创建: {createdDate}</div>
                    )}
                  </div>
                  
                  {/* 第三行：注册链接 */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">注册链接:</span>
                    <a 
                      href={inviteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex-1 truncate"
                    >
                      {inviteUrl}
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(code.code)}
                      className="shrink-0"
                    >
                      {copiedCode === code.code ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          已复制
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          复制链接
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
