import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : null
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Global module-level state (not React context) so the toggle works from a
// single mounted component without needing to wrap the whole app in a
// provider - this app has no shared layout, pages render their own headers.
let currentTheme: Theme = readStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
applyTheme(currentTheme)
const listeners = new Set<(t: Theme) => void>()

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  useEffect(() => {
    listeners.add(setThemeState)
    return () => {
      listeners.delete(setThemeState)
    }
  }, [])

  function setTheme(next: Theme) {
    currentTheme = next
    window.localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    listeners.forEach((l) => l(next))
  }

  return [theme, setTheme]
}
