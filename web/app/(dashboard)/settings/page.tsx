import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"

export default function SettingsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1">设置</h1>
          <p className="text-xs text-muted-foreground">
            账户设置和偏好配置
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>设置功能开发中...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
