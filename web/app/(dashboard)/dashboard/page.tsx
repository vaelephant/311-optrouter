import { DashboardShell } from "../components/dashboard-shell"
import { DashboardLayout } from "../components/dashboard-layout"
import { AuthGuard } from "../../(auth)/components/auth-guard"

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <DashboardShell />
      </DashboardLayout>
    </AuthGuard>
  )
}

