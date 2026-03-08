"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/(dashboard)/components/dashboard-layout"
import { AuthGuard } from "@/app/(auth)/components/auth-guard"
import { SuperadminNav } from "@/app/(superadmin)/components/superadmin-nav"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"

type RewardRule = {
  id: number
  inviteCount: number
  rewardType: string
  rewardValue: number
  rewardName: string
  rewardDescription: string
  isActive: boolean
}

function inviteCountLabel(count: number): string {
  if (count === 0) return "被邀请人首充"
  if (count === -1) return "每邀请1人"
  return `邀请满${count}人`
}

export default function SuperadminInviteRewardsPage() {
  const [rules, setRules] = useState<RewardRule[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRules = () => {
    fetch("/api/superadmin/invite-rewards")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data?.rules) {
          setRules(
            json.data.rules.map((r: RewardRule) => ({
              ...r,
              rewardDescription: r.rewardDescription ?? "",
            }))
          )
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    fetchRules()
  }, [])

  if (loading) {
    return (
      <AuthGuard>
        <DashboardLayout>
          <div className="p-6">
            <SuperadminNav />
            <p className="text-muted-foreground">加载中…</p>
          </div>
        </DashboardLayout>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <SuperadminNav />
          <div>
            <h1 className="text-lg font-semibold mb-1">邀请奖励设置</h1>
            <p className="text-xs text-muted-foreground">
              所有邀请奖励规则，reward_type=balance 时 reward_value 为金额（元），其余为积分等
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">奖励规则列表</CardTitle>
              <p className="text-xs text-muted-foreground">共 {rules.length} 条，可修改后点击该行保存</p>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">invite_count 含义</TableHead>
                      <TableHead className="w-[90px]">类型</TableHead>
                      <TableHead className="w-[100px]">数值</TableHead>
                      <TableHead>奖励名称</TableHead>
                      <TableHead>描述</TableHead>
                      <TableHead className="w-[70px]">启用</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          暂无奖励规则
                        </TableCell>
                      </TableRow>
                    ) : (
                      rules.map((rule) => (
                        <RewardRuleRow
                          key={rule.id}
                          rule={rule}
                          onSaved={(updated) => {
                            setRules((prev) =>
                              prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
                            )
                          }}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}

function RewardRuleRow({
  rule,
  onSaved,
}: {
  rule: RewardRule
  onSaved: (updated: Partial<RewardRule>) => void
}) {
  const [rewardValue, setRewardValue] = useState(String(rule.rewardValue))
  const [rewardName, setRewardName] = useState(rule.rewardName)
  const [rewardDescription, setRewardDescription] = useState(rule.rewardDescription)
  const [isActive, setIsActive] = useState(rule.isActive)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<"success" | "error" | null>(null)

  const isDirty =
    rewardValue !== String(rule.rewardValue) ||
    rewardName !== rule.rewardName ||
    rewardDescription !== rule.rewardDescription ||
    isActive !== rule.isActive

  const handleSave = () => {
    const value = Number(rewardValue)
    if (Number.isNaN(value) || value < 0) {
      setMsg("error")
      return
    }
    setSaving(true)
    setMsg(null)
    fetch("/api/superadmin/invite-rewards", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: rule.id,
        rewardValue: value,
        rewardName: rewardName.trim() || undefined,
        rewardDescription: rewardDescription.trim() || null,
        isActive,
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          onSaved(json.data)
          setMsg("success")
        } else {
          setMsg("error")
        }
      })
      .catch(() => setMsg("error"))
      .finally(() => setSaving(false))
  }

  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground font-medium">
        {inviteCountLabel(rule.inviteCount)}
      </TableCell>
      <TableCell>
        <span className="text-xs">{rule.rewardType}</span>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={rule.rewardType === "balance" ? 0.01 : 1}
          className="h-8 w-24 text-xs"
          value={rewardValue}
          onChange={(e) => setRewardValue(e.target.value)}
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs min-w-[120px]"
          value={rewardName}
          onChange={(e) => setRewardName(e.target.value)}
          placeholder="奖励名称"
        />
      </TableCell>
      <TableCell>
        <Input
          className="h-8 text-xs min-w-[180px]"
          value={rewardDescription}
          onChange={(e) => setRewardDescription(e.target.value)}
          placeholder="描述"
        />
      </TableCell>
      <TableCell>
        <Switch checked={isActive} onCheckedChange={setIsActive} disabled={saving} />
      </TableCell>
      <TableCell>
        {isDirty && (
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
          </Button>
        )}
        {msg === "success" && (
          <span className="text-xs text-green-600">已保存</span>
        )}
        {msg === "error" && (
          <span className="text-xs text-destructive">失败</span>
        )}
      </TableCell>
    </TableRow>
  )
}
