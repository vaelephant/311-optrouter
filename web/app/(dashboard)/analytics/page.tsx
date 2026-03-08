import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"

export default function AnalyticsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1">用量分析</h1>
          <p className="text-xs text-muted-foreground">
            查看详细的 API 使用统计和分析
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>用量分析功能开发中...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
