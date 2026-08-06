import { useAuthStore } from '@/stores/auth-store'
import { useEffect } from 'react'

export function useAuth() {
  const {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    setTokens,
    initialize,
  } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login,
    logout,
    setUser,
    setTokens,
  }
}
