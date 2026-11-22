import type { JSX } from 'react'

import { ProjectSwitcher } from '@/app/shell/project-switcher'
import {
  PROJECT_GROUPS,
  type ProjectLocation,
  type ProjectSection,
  sectionPath,
  sectionsOf,
} from '@/app/shell/project-sections'
import { ariaCurrentPage } from '@/shared/lib/aria-current'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'

/** The open project at the top, then its pages in labeled groups, like a resource's tabs. */
export function ProjectSidebar({ location }: { location: ProjectLocation }): JSX.Element {
  return (
    <div className="flex flex-col gap-1 px-2 pt-2 pb-4">
      <ProjectSwitcher projectId={location.projectId} />
      <nav aria-label="Páginas do projeto" className="flex flex-col gap-3 pt-2">
        {PROJECT_GROUPS.map((group) => (
          <div key={group.id} className="grid gap-px">
            <GroupLabel label={group.label} />
            <ul className="grid gap-px">
              {sectionsOf(group.id).map((section) => (
                <li key={section.segment}>
                  <SectionLink
                    projectId={location.projectId}
                    section={section}
                    isCurrent={section === location.section}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  )
}

function GroupLabel({ label }: { label: string | null }): JSX.Element | null {
  if (label === null) {
    return null
  }

  return (
    <p className="px-2 pt-1 pb-1.5 text-2xs font-medium tracking-[0.025em] text-muted-foreground uppercase">
      {label}
    </p>
  )
}

type SectionLinkProps = { projectId: string; section: ProjectSection; isCurrent: boolean }

function SectionLink({ projectId, section, isCurrent }: SectionLinkProps): JSX.Element {
  const Glyph = section.icon

  return (
    <RouterLink
      href={sectionPath(projectId, section)}
      aria-current={ariaCurrentPage(isCurrent)}
      className={cn(
        'flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-surface hover:text-foreground',
        isCurrent && 'bg-surface-hover font-medium text-foreground hover:bg-surface-hover',
      )}
    >
      <Glyph
        aria-hidden
        className={cn('size-4 shrink-0 transition-colors', isCurrent && 'text-brand')}
      />
      <span className="truncate">{section.label}</span>
    </RouterLink>
  )
}
