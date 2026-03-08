/**
 * 注册页面 - 邀请码输入字段组件
 * 
 * 功能：
 *   - 从 URL 参数自动读取邀请码 (?invite_code=XXXX)
 *   - 输入邀请码后自动防抖验证
 *   - 显示验证状态（加载中、有效、无效）
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { verifyInviteCode } from "@/lib/api/invite"
import { useDebounce } from "@/lib/hooks/use-debounce"

interface RegisterInviteCodeFieldProps {
  /** 来自表单验证的邀请码字段错误信息 */
  fieldErrors?: string[]
  /** 邀请码变化回调 */
  onInviteCodeChange?: (code: string) => void
}

export function RegisterInviteCodeField({ fieldErrors, onInviteCodeChange }: RegisterInviteCodeFieldProps) {
  const searchParams = useSearchParams()
  
  // 邀请码相关状态
  const [inviteCode, setInviteCode] = useState("")
  const [inviteCodeValidating, setInviteCodeValidating] = useState(false)
  const [inviteCodeResult, setInviteCodeResult] = useState<{
    valid: boolean
    message?: string
    inviterEmail?: string
  } | null>(null)

  // 从 URL 参数读取邀请码
  useEffect(() => {
    const inviteCodeParam = searchParams.get('invite_code')
    if (inviteCodeParam) {
      const code = inviteCodeParam.toUpperCase().trim().substring(0, 4)
      setInviteCode(code)
      // 通知父组件邀请码已从 URL 读取
      onInviteCodeChange?.(code)
    }
  }, [searchParams, onInviteCodeChange])

  // 防抖后的邀请码值
  const debouncedInviteCode = useDebounce(inviteCode.trim().toUpperCase(), 500)

  // 验证邀请码
  const validateInviteCode = useCallback(async (code: string) => {
    if (!code || code.length !== 4) {
      setInviteCodeResult(null)
      return
    }

    setInviteCodeValidating(true)
    try {
      const result = await verifyInviteCode(code)
      if (result.success && result.valid) {
        setInviteCodeResult({
          valid: true,
          inviterEmail: result.invite_code?.inviter_email || "",
        })
      } else {
        setInviteCodeResult({
          valid: false,
          message: result.detail || "邀请码无效",
        })
      }
    } catch (error: any) {
      setInviteCodeResult({
        valid: false,
        message: error.message || "验证邀请码失败",
      })
    } finally {
      setInviteCodeValidating(false)
    }
  }, [])

  // 当防抖后的邀请码改变时，验证邀请码
  useEffect(() => {
    if (debouncedInviteCode && debouncedInviteCode.length === 4) {
      validateInviteCode(debouncedInviteCode)
    } else if (!debouncedInviteCode) {
      setInviteCodeResult(null)
      setInviteCodeValidating(false)
    }
  }, [debouncedInviteCode, validateInviteCode])

  return (
    <div className="space-y-2">
      <Label htmlFor="invite_code">
        邀请码 <span className="text-muted-foreground font-normal">(可选)</span>
      </Label>
      <div className="relative">
        <Input
          id="invite_code"
          name="invite_code"
          type="text"
          placeholder="请输入4位邀请码"
          maxLength={4}
          value={inviteCode}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
            setInviteCode(value)
            onInviteCodeChange?.(value)
          }}
          onBlur={(e) => {
            // 确保失焦时也通知父组件
            const value = e.target.value.toUpperCase().trim()
            if (value && value.length === 4) {
              onInviteCodeChange?.(value)
            }
          }}
          className={
            inviteCodeResult?.valid 
              ? "border-green-500" 
              : inviteCodeResult?.valid === false 
              ? "border-destructive" 
              : ""
          }
          aria-describedby={
            fieldErrors
              ? "invite-code-error"
              : inviteCodeResult
              ? "invite-code-status"
              : undefined
          }
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {inviteCodeValidating ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : inviteCodeResult?.valid ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : inviteCodeResult?.valid === false ? (
            <XCircle className="h-4 w-4 text-destructive" />
          ) : null}
        </div>
      </div>
      {fieldErrors && (
        <p id="invite-code-error" className="text-sm text-destructive">
          {fieldErrors[0]}
        </p>
      )}
      {inviteCodeResult?.valid && (
        <p id="invite-code-status" className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          邀请码有效
          {inviteCodeResult.inviterEmail && (
            <span className="text-muted-foreground">
              （邀请人：{inviteCodeResult.inviterEmail}）
            </span>
          )}
        </p>
      )}
      {inviteCodeResult?.valid === false && (
        <p id="invite-code-status" className="text-sm text-destructive">
          {inviteCodeResult.message || "邀请码无效"}
        </p>
      )}
      {inviteCode && !inviteCodeResult && inviteCode.length === 4 && (
        <p className="text-xs text-muted-foreground">正在验证邀请码...</p>
      )}
      {inviteCode.length > 0 && inviteCode.length < 4 && (
        <p className="text-xs text-muted-foreground">邀请码为4位字母或数字</p>
      )}
    </div>
  )
}
