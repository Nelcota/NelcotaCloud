import { useContext } from 'react'

import { ThemeModeContext, type ThemeModeState } from '@/shared/theme/theme-mode-context'

/** The console's color mode and the toggle the account menu uses. */
export function useThemeMode(): ThemeModeState {
  const state = useContext(ThemeModeContext)

  if (state === null) {
    throw new Error('useThemeMode must be used inside ConsoleTheme')
  }

  return state
}
