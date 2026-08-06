import { createContext, useContext, useMemo } from 'react'
import { useTheme } from '@/hooks/use-theme'
import type { Theme } from '@/types/theme'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme()

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: theme.theme,
      setTheme: theme.setTheme,
      toggleTheme: theme.toggleTheme,
    }),
    [theme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}
