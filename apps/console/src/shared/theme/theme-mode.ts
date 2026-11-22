export type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'nelcota-theme'

/** The remembered choice, dark when there is none or storage is blocked. */
export function storedThemeMode(): ThemeMode {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'light') {
      return 'light'
    }
  } catch {
    return 'dark'
  }

  return 'dark'
}

export function storeThemeMode(mode: ThemeMode): void {
  // Storage can be blocked (private windows); the choice then lasts for this page only.
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    return
  }
}

export function oppositeThemeMode(mode: ThemeMode): ThemeMode {
  if (mode === 'dark') {
    return 'light'
  }

  return 'dark'
}
