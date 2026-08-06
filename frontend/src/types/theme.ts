export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'wsms-theme'

export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

export function setStoredTheme(theme: Theme): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
}
