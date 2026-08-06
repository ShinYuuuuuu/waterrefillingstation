import { useState, useEffect, useCallback } from 'react'
import { getSystemTheme, getStoredTheme, setStoredTheme, type Theme } from '@/utils/theme'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    return getStoredTheme() || getSystemTheme()
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    setStoredTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)
  }, [])

  return { theme, setTheme, toggleTheme }
}
