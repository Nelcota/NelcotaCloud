import { Link } from '@tanstack/react-router'
import { FolderKanban } from 'lucide-react'
import type { JSX } from 'react'

import { ThemeToggle } from '@/app/shell/theme-toggle'
import { LogoMark } from '@/shared/ui/logo-mark'

/** The outermost rail: home, the project list, and the theme. Every icon has a name. */
export function IconRail(): JSX.Element {
  return (
    <div className="flex h-full flex-col items-center gap-2 py-3">
      <Link to="/" aria-label="NelcotaCloud, início" className="mb-3 rounded-md">
        <LogoMark className="size-9" />
      </Link>
      <Link
        to="/"
        aria-label="Projetos"
        title="Projetos"
        className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-10 items-center justify-center rounded-md transition-colors"
        activeOptions={{ exact: true }}
        activeProps={{ className: 'bg-sidebar-accent text-primary' }}
      >
        <FolderKanban className="size-5" strokeWidth={1.75} />
      </Link>
      <div className="flex-1" />
      <ThemeToggle className="size-10 justify-center" />
    </div>
  )
}
