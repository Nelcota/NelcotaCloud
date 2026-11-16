import { Moon, Sun } from 'lucide-react'
import type { JSX } from 'react'

import { type Theme, useTheme } from '@/shared/theme/use-theme'
import { cn } from '@/shared/lib/class-names'

/** Switches between the dark and light themes; `withLabel` shows the name next to the icon. */
export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string
  withLabel?: boolean
}): JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const label = themeLabel(theme)

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={cn(
        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-md transition-colors',
        className,
      )}
    >
      <ThemeIcon theme={theme} />
      <VisibleLabel isShown={withLabel} label={label} />
    </button>
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
    return <Sun className="size-5 shrink-0" strokeWidth={1.75} />
  }

  return <Moon className="size-5 shrink-0" strokeWidth={1.75} />
}

function VisibleLabel({ isShown, label }: { isShown: boolean; label: string }): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return <span className="text-sm">{label}</span>
}
