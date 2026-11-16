import { Link } from '@tanstack/react-router'
import { FolderKanban, Moon, Sun } from 'lucide-react'
import type { JSX } from 'react'

import { useTheme } from '@/shared/theme/use-theme'
import { LogoMark } from '@/shared/ui/logo-mark'

const RAIL_BUTTON =
  'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-10 items-center justify-center rounded-md transition-colors'

/** The outermost rail: home, the project list, and the theme. Every icon has a name. */
export function IconRail(): JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="flex h-full flex-col items-center gap-2 py-3">
      <Link to="/" aria-label="NelcotaCloud, início" className="mb-3 rounded-md">
        <LogoMark className="size-9" />
      </Link>
      <Link
        to="/"
        aria-label="Projetos"
        title="Projetos"
        className={RAIL_BUTTON}
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-sidebar-accent text-primary' }}
      >
        <FolderKanban className="size-5" strokeWidth={1.75} />
      </Link>
      <div className="flex-1" />
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={themeLabel(theme)}
        title={themeLabel(theme)}
        className={RAIL_BUTTON}
      >
        <ThemeIcon theme={theme} />
      </button>
    </div>
  )
}

function themeLabel(theme: 'dark' | 'light'): string {
  if (theme === 'dark') {
    return 'Usar tema claro'
  }

  return 'Usar tema escuro'
}

function ThemeIcon({ theme }: { theme: 'dark' | 'light' }): JSX.Element {
  if (theme === 'dark') {
    return <Sun className="size-5" strokeWidth={1.75} />
  }

  return <Moon className="size-5" strokeWidth={1.75} />
}
