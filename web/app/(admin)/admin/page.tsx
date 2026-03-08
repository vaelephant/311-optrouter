import { DashboardLayout } from "../../(dashboard)/components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LineChart, Users, BarChart3, Settings } from "lucide-react"
import Link from "next/link"

export default function AdminPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1">管理后台</h1>
          <p className="text-xs text-muted-foreground">
            系统管理和数据统计
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 用户统计 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">用户统计</CardTitle>
                  <CardDescription>查看注册和登录用户数据</CardDescription>
                </div>
                <LineChart className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                查看系统总注册用户数、登录用户数以及每日趋势统计
              </p>
              <Link href="/admin/stats">
                <Button className="w-full" variant="outline">
                  查看统计
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* 预留其他管理功能 */}
          <Card className="hover:shadow-md transition-shadow opacity-50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-medium">系统设置</CardTitle>
                  <CardDescription>系统配置和管理</CardDescription>
                </div>
                <Settings className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                系统配置功能开发中...
              </p>
              <Button className="w-full" variant="outline" disabled>
                即将推出
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
