import { createContext, useContext, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import type { User, AuthState, LoginCredentials } from '@/types/auth'

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: User | null) => void
  setTokens: (accessToken: string, refreshToken: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore()

  // Run the auth bootstrap exactly once on mount. The dependency is the
  // stable `initialize` method reference (not the whole `store` state object,
  // whose identity changes on every `set`). Depending on `store` would re-run
  // `initialize()` after every state mutation, producing an infinite
  // initialize() -> /auth/me -> set -> re-render loop.
  useEffect(() => {
    console.log('[AUTH DEBUG] AUTH_PROVIDER_INITIALIZE', {
      hasToken: !!localStorage.getItem('access_token'),
      isLoading: store.isLoading,
    })
    void store.initialize()
  }, [store.initialize])

  // Build the context value directly on each render so consumers always read
  // the latest auth state. Memoizing this object keyed on the store is fragile:
  // it couples the value's freshness to the store object identity rather than
  // to the individual auth fields, which risks retaining stale snapshots across
  // re-renders (e.g. redirect loops after login).
  const value: AuthContextType = {
    user: store.user,
    accessToken: store.accessToken,
    refreshToken: store.refreshToken,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    login: store.login,
    logout: store.logout,
    setUser: store.setUser,
    setTokens: store.setTokens,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
