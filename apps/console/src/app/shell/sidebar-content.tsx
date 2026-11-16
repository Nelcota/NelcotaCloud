import { Link, useLocation } from '@tanstack/react-router'
import { FolderKanban } from 'lucide-react'
import type { JSX } from 'react'

import { ApiStatus } from '@/app/shell/api-status'
import { ProjectNav } from '@/app/shell/project-nav'
import { projectLocation } from '@/app/shell/project-sections'
import { LogoMark } from '@/shared/ui/logo-mark'

/**
 * What the sidebar holds: home, every project, the open project's pages and the API status.
 * The desktop column and the mobile sheet render the same content.
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <div className="flex h-full flex-col">
      <Link
        to="/"
        onClick={onNavigate}
        aria-label="NelcotaCloud, início"
        className="flex h-14 shrink-0 items-center gap-3 border-b px-5"
      >
        <LogoMark className="size-8" />
        <span className="font-semibold tracking-tight">NelcotaCloud</span>
      </Link>
      <div className="grid flex-1 content-start gap-6 overflow-y-auto px-3 py-4">
        <ProjectsLink onNavigate={onNavigate} />
        <CurrentProjectNav onNavigate={onNavigate} />
      </div>
      <div className="border-t px-6 py-4">
        <ApiStatus />
      </div>
    </div>
  )
}

function ProjectsLink({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      activeOptions={{ exact: true }}
      activeProps={{ className: 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold' }}
      className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors"
    >
      <FolderKanban className="size-4 shrink-0" strokeWidth={1.75} />
      Todos os projetos
    </Link>
  )
}

function CurrentProjectNav({ onNavigate }: { onNavigate?: () => void }): JSX.Element | null {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return null
  }

  return (
    <ProjectNav
      projectId={location.projectId}
      currentSection={location.section}
      onNavigate={onNavigate}
    />
  )
}
