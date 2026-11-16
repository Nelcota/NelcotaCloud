import { useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'nelcota-theme'
const DARK_CLASS = 'dark'

function currentTheme(): Theme {
  if (document.documentElement.classList.contains(DARK_CLASS)) {
    return 'dark'
  }

  return 'light'
}

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')

  // Storage can be blocked (private windows); the theme then lasts for this page only.
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    return
  }
}

/** The console theme; dark by default, the choice is remembered per browser. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  function toggleTheme(): void {
    const next = nextTheme(theme)
    applyTheme(next)
    setTheme(next)
  }

  return { theme, toggleTheme }
}

function nextTheme(theme: Theme): Theme {
  if (theme === 'dark') {
    return 'light'
  }

  return 'dark'
}
