import { Navigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/auth-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface PublicRouteProps {
  children: React.ReactNode
}

export function PublicRoute({ children }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext()

  console.log('[AUTH DEBUG] PUBLIC_ROUTE', {
    isLoading,
    isAuthenticated,
    pathname: window.location.pathname,
  })

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (isAuthenticated) {
    console.log('[AUTH DEBUG] PUBLIC_ROUTE_REDIRECT', { to: '/dashboard' })
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
