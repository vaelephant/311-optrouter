"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { saveUserAuth, isAuthenticated } from '@/lib/auth-client'
import { RegisterInviteCodeField } from '@/app/(invite)/components/RegisterInviteCodeField'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isMounted, setIsMounted] = useState(false)

  // 从表单中获取邀请码
  const handleInviteCodeChange = (code: string) => {
    setInviteCode(code)
  }

  // 组件挂载后检查
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 如果已登录且没有邀请码参数，重定向到仪表盘
  // 如果有邀请码参数，允许查看注册页面（可能是想注册新账号）
  useEffect(() => {
    if (!isMounted) return
    
    const hasInviteCode = searchParams.get('invite_code')
    
    // 如果已登录且没有邀请码，才跳转
    if (isAuthenticated() && !hasInviteCode) {
      router.push('/dashboard')
    }
  }, [router, searchParams, isMounted])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证密码
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    setLoading(true)

    // 从 URL 参数或表单中获取邀请码
    const urlInviteCode = searchParams.get('invite_code')
    const finalInviteCode = inviteCode?.trim() || urlInviteCode?.trim().toUpperCase() || undefined

    try {
      const requestBody = { 
        email, 
        password,
        invite_code: finalInviteCode,
      }
      console.log('[注册页面] 提交注册请求:', { 
        email, 
        hasInviteCode: !!requestBody.invite_code, 
        inviteCode: requestBody.invite_code,
        fromUrl: !!urlInviteCode,
        fromForm: !!inviteCode
      })
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.success) {
        const userId = data.user_id || data.userId
        if (!userId) {
          setError('注册返回缺少 user_id，请检查后端返回字段')
          return
        }
        // 保存用户信息到 localStorage
        saveUserAuth(userId, data.email, data.token)
        // 重定向到仪表盘
        router.push('/dashboard')
        router.refresh()
      } else {
        setError(data.detail || '注册失败，请稍后重试')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>注册</CardTitle>
          <CardDescription>创建新账号</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="至少6位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <RegisterInviteCodeField onInviteCodeChange={handleInviteCodeChange} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '注册中...' : '注册'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              已有账号？{' '}
              <Link href="/login" className="text-primary hover:underline">
                立即登录
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
