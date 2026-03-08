import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"

export default function DocsPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="mb-6">
          <h1 className="text-lg font-semibold mb-1">文档</h1>
          <p className="text-xs text-muted-foreground">
            API 文档和使用指南
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <p>文档功能开发中...</p>
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
