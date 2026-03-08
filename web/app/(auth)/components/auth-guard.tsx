"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { isAuthenticated } from '@/lib/auth-client'

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuth, setIsAuth] = useState(false)

  useEffect(() => {
    // 只在客户端检查认证状态
    const checkAuth = () => {
      const authenticated = isAuthenticated()
      setIsAuth(authenticated)
      setIsChecking(false)

      if (!authenticated && pathname !== '/login' && pathname !== '/register') {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router, pathname])

  // 在检查完成前，不渲染任何内容（避免 hydration mismatch）
  if (isChecking) {
    return null
  }

  // 如果未登录，不渲染子组件
  if (!isAuth) {
    return null
  }

  return <>{children}</>
}
