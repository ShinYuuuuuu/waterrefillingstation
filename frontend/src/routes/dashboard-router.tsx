import { useAuthContext } from '@/contexts/auth-context'
import { DashboardPage } from '@/pages/dashboard'
import { CashierDashboard } from '@/pages/cashier-dashboard'
import { Navigate } from 'react-router-dom'

export function DashboardRouter() {
  const { user } = useAuthContext()
  const role = user?.role?.toLowerCase()

  if (role === 'cashier') {
    return <CashierDashboard />
  }

  if (role === 'rider') {
    return <Navigate to="/deliveries" replace />
  }

  return <DashboardPage />
}
