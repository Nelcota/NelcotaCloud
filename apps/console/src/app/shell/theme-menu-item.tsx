import { Moon, Sun } from 'lucide-react'
import type { JSX } from 'react'

import { type Theme, useTheme } from '@/shared/theme/use-theme'
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu'

/** Switches between the dark and light themes from the account menu. */
export function ThemeMenuItem(): JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <DropdownMenuItem closeOnClick={false} onClick={toggleTheme}>
      <ThemeIcon theme={theme} />
      {themeLabel(theme)}
    </DropdownMenuItem>
  )
}

function themeLabel(theme: Theme): string {
  if (theme === 'dark') {
    return 'Usar tema claro'
  }

  return 'Usar tema escuro'
}

function ThemeIcon({ theme }: { theme: Theme }): JSX.Element {
  if (theme === 'dark') {
    return <Sun strokeWidth={1.75} />
  }

  return <Moon strokeWidth={1.75} />
}
