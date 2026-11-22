import { createContext } from 'react'

import type { ThemeMode } from '@/shared/theme/theme-mode'

export type ThemeModeState = {
  mode: ThemeMode
  toggleMode: () => void
}

export const ThemeModeContext = createContext<ThemeModeState | null>(null)
