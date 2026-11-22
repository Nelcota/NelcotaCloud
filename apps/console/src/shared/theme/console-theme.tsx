import { type JSX, type ReactNode, useLayoutEffect, useState } from 'react'

import { TooltipProvider } from '@/shared/ui/primitives/tooltip'
import { oppositeThemeMode, storedThemeMode, storeThemeMode } from '@/shared/theme/theme-mode'
import { ThemeModeContext } from '@/shared/theme/theme-mode-context'

export function ConsoleTheme({ children }: { children: ReactNode }): JSX.Element {
  const [mode, setMode] = useState(storedThemeMode)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.themeSwitching = ''
    root.dataset.theme = mode
    const frame = requestAnimationFrame(() => {
      delete root.dataset.themeSwitching
    })

    return () => {
      cancelAnimationFrame(frame)
      delete root.dataset.themeSwitching
    }
  }, [mode])

  function toggleMode(): void {
    const next = oppositeThemeMode(mode)
    storeThemeMode(next)
    setMode(next)
  }

  return (
    <ThemeModeContext value={{ mode, toggleMode }}>
      <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
    </ThemeModeContext>
  )
}
