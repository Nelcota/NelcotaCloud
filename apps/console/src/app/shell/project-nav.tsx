import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { PROJECT_SECTIONS, type ProjectSection, sectionPath } from '@/app/shell/project-sections'
import { cn } from '@/shared/lib/class-names'

type ProjectNavProps = {
  projectId: string
  currentSection: ProjectSection
  onNavigate?: () => void
}

/** A project's pages. The current one is marked by its fill, weight and accent-colored icon. */
export function ProjectNav({
  projectId,
  currentSection,
  onNavigate,
}: ProjectNavProps): JSX.Element {
  return (
    <nav aria-label="Projeto">
      <p className="text-muted-foreground px-3 pb-2 text-xs font-medium">Projeto</p>
      <ul className="grid gap-0.5">
        {PROJECT_SECTIONS.map((section) => (
          <li key={section.segment}>
            <SectionLink
              projectId={projectId}
              section={section}
              isCurrent={section === currentSection}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}

type SectionLinkProps = {
  projectId: string
  section: ProjectSection
  isCurrent: boolean
  onNavigate?: () => void
}

function SectionLink({ projectId, section, isCurrent, onNavigate }: SectionLinkProps): JSX.Element {
  const Icon = section.icon

  return (
    <Link
      to={sectionPath(projectId, section)}
      onClick={onNavigate}
      aria-current={ariaCurrent(isCurrent)}
      className={cn(
        'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors',
        isCurrent && 'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
      )}
    >
      <Icon className={cn('size-4 shrink-0', isCurrent && 'text-primary')} strokeWidth={1.75} />
      {section.label}
    </Link>
  )
}

function ariaCurrent(isCurrent: boolean): 'page' | undefined {
  if (isCurrent) {
    return 'page'
  }

  return undefined
}
