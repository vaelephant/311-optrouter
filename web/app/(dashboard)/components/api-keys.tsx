"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Copy, Eye, EyeOff, Plus, Trash2, Check } from "lucide-react"
import { getCurrentUserId } from "@/lib/auth-client"

interface ApiKey {
  id: string
  masked_key: string
  status: string
  quota_limit: number
  quota_used: number
  created_at: string
  expires_at: string | null
}

export function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  useEffect(() => {
    loadKeys()
  }, [])

  const loadKeys = async () => {
    const userId = getCurrentUserId()
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/keys', {
        headers: { 'x-user-id': userId },
      })
      const data = await response.json()
      setKeys(data.data || [])
    } catch (error) {
      console.error('Failed to load keys:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async () => {
    const userId = getCurrentUserId()
    if (!userId) {
      return
    }

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
      })
      const data = await response.json()
      setNewKey(data.key)
      loadKeys()
    } catch (error) {
      console.error('Failed to create key:', error)
    }
  }

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('确定要撤销这个 API Key 吗？')) {
      return
    }

    const userId = getCurrentUserId()
    if (!userId) {
      return
    }

    try {
      await fetch('/api/keys', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ key_id: keyId }),
      })
      loadKeys()
    } catch (error) {
      console.error('Failed to revoke key:', error)
    }
  }

  const toggleVisibility = (id: string) => {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const copyKey = (id: string, key: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKey(id)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const maskKey = (key: string) => {
    return key.slice(0, 12) + "..." + key.slice(-4)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '永不过期'
    return new Date(dateString).toLocaleDateString('zh-CN')
  }

  const getQuotaPercent = (used: number, limit: number) => {
    return Math.round((used / limit) * 100)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium text-card-foreground">
          API 密钥
        </CardTitle>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setShowCreateModal(true)}>
          <Plus className="size-3" />
          新建密钥
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            暂无 API Keys，点击创建开始使用
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-card-foreground">
                      API Key
                    </span>
                    <Badge
                      variant={apiKey.status === "active" ? "secondary" : "outline"}
                      className={`text-[9px] px-1.5 py-0 ${
                        apiKey.status === "active"
                          ? "bg-success/15 text-success border-0"
                          : "text-muted-foreground"
                      }`}
                    >
                      {apiKey.status === "active" ? "活跃" : "已撤销"}
                    </Badge>
                  </div>
                  <div className="mt-1">
                    <code className="text-[11px] font-mono text-muted-foreground">
                      {apiKey.masked_key}
                    </code>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>创建于 {formatDate(apiKey.created_at)}</span>
                    <span>过期: {formatDate(apiKey.expires_at)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          getQuotaPercent(apiKey.quota_used, apiKey.quota_limit) > 90
                            ? "bg-destructive"
                            : "bg-primary"
                        }`}
                        style={{
                          width: `${getQuotaPercent(apiKey.quota_used, apiKey.quota_limit)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {apiKey.quota_used.toLocaleString()} / {apiKey.quota_limit.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {apiKey.status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRevokeKey(apiKey.id)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg">
              {newKey ? (
                <>
                  <h3 className="text-lg font-semibold mb-4">API Key 已创建</h3>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3 mb-4">
                    <p className="text-sm text-yellow-500">
                      请立即复制您的 API Key，此 key 只会显示一次！
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">
                      {newKey}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(newKey)
                        setCopiedKey('new')
                        setTimeout(() => setCopiedKey(null), 2000)
                      }}
                    >
                      {copiedKey === 'new' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewKey(null)
                    }}
                  >
                    完成
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-4">创建新的 API Key</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    API Key 将拥有默认的配额限制。您可以在创建后修改。
                  </p>
                  <div className="flex justify-end gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                    >
                      取消
                    </Button>
                    <Button onClick={handleCreateKey}>创建</Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
