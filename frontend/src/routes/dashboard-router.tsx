import { useAuthContext } from '@/contexts/auth-context'
import { DashboardPage } from '@/pages/dashboard'
import { CashierDashboard } from '@/pages/cashier-dashboard'

export function DashboardRouter() {
  const { user } = useAuthContext()
  const role = user?.role?.toLowerCase()

  if (role === 'cashier') {
    return <CashierDashboard />
  }

  return <DashboardPage />
}
