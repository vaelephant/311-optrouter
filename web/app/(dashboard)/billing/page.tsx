import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"
import { BillingHistory } from "../components/billing-history"

export default function BillingPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <div className="p-6">
          <div className="mb-6">
            <h1 className="text-lg font-semibold mb-1">账单</h1>
            <p className="text-xs text-muted-foreground">
              查看余额、充值记录和收支流水
            </p>
          </div>
          <BillingHistory />
        </div>
      </DashboardLayout>
    </AuthGuard>
  )
}
