import { Link, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { PROJECT_SECTIONS, projectLocation, sectionPath } from '@/app/shell/project-sections'
import { ApiStatus } from '@/app/shell/api-status'
import { cn } from '@/shared/lib/class-names'

/** A project's pages. The current one is marked by its fill, weight and accent-colored icon. */
export function ProjectSidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element | null {
  const { pathname } = useLocation()
  const location = projectLocation(pathname)

  if (location === null) {
    return null
  }

  return (
    <div className="flex h-full flex-col">
      <nav aria-label="Projeto" className="flex-1 px-3 py-4">
        <p className="text-muted-foreground px-3 pb-2 text-xs font-medium">Projeto</p>
        <ul className="grid gap-0.5">
          {PROJECT_SECTIONS.map((section) => {
            const isCurrent = section === location.section
            const Icon = section.icon

            return (
              <li key={section.segment}>
                <Link
                  to={sectionPath(location.projectId, section)}
                  onClick={onNavigate}
                  aria-current={ariaCurrent(isCurrent)}
                  className={cn(
                    'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
                    isCurrent && 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
                  )}
                >
                  <Icon
                    className={cn('size-4 shrink-0', isCurrent && 'text-primary')}
                    strokeWidth={1.75}
                  />
                  {section.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="border-sidebar-border border-t px-6 py-4">
        <ApiStatus />
      </div>
    </div>
  )
}

function ariaCurrent(isCurrent: boolean): 'page' | undefined {
  if (isCurrent) {
    return 'page'
  }

  return undefined
}
