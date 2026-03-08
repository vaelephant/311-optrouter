import { DashboardLayout } from "../../(dashboard)/components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"
import { ApiKeys } from "../../(dashboard)/components/api-keys"

export default function KeysPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold mb-1">API 密钥</h1>
            <p className="text-xs text-muted-foreground">
              管理你的 API 密钥
            </p>
          </div>
          <ApiKeys />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
