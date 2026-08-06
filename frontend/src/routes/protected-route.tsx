import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '@/contexts/auth-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthContext()
  const location = useLocation()

  console.log('[AUTH DEBUG] PROTECTED_ROUTE', {
    isLoading,
    user,
    isAuthenticated,
    pathname: location.pathname,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('[AUTH DEBUG] PROTECTED_ROUTE_REDIRECT', { to: '/login', from: location.pathname })
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRoles && requiredRoles.length > 0 && user) {
    if (!requiredRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />
    }
  }

  return <>{children}</>
}
