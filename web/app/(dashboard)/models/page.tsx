import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"

export default function ModelsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1">模型管理</h1>
          <p className="text-xs text-muted-foreground">
            查看和管理可用的 AI 模型
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>模型管理功能开发中...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
