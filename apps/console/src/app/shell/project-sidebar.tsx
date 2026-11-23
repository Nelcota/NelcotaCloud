import type { JSX } from 'react'

import {
  PROJECT_GROUPS,
  type ProjectLocation,
  type ProjectSection,
  pinnedSections,
  sectionPath,
  sectionsOf,
} from '@/app/shell/project-sections'
import { ariaCurrentPage } from '@/shared/lib/aria-current'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'

/** The open project's pages in labeled groups, with the pinned ones at the foot. */
export function ProjectSidebar({ location }: { location: ProjectLocation }): JSX.Element {
  return (
    <div className="flex min-h-full flex-col px-2 pt-5 pb-2">
      <nav aria-label="Páginas do projeto" className="flex flex-1 flex-col">
        {PROJECT_GROUPS.map((group) => (
          <div key={group.id} className="grid gap-0.5 py-4 first:pt-0">
            <GroupLabel label={group.label} />
            <SectionList sections={sectionsOf(group.id)} location={location} />
          </div>
        ))}
        <div className="mt-auto pt-4">
          <SectionList sections={pinnedSections()} location={location} />
        </div>
      </nav>
    </div>
  )
}

type SectionListProps = { sections: readonly ProjectSection[]; location: ProjectLocation }

function SectionList({ sections, location }: SectionListProps): JSX.Element {
  return (
    <ul className="grid gap-0.5">
      {sections.map((section) => (
        <li key={section.segment}>
          <SectionLink
            projectId={location.projectId}
            section={section}
            isCurrent={section === location.section}
          />
        </li>
      ))}
    </ul>
  )
}

function GroupLabel({ label }: { label: string | null }): JSX.Element | null {
  if (label === null) {
    return null
  }

  /* The links' own padding (px-2.5), so the label starts on the icons' leading edge. */
  return <p className="type-label px-2.5 pt-1 pb-1.5 text-muted-foreground">{label}</p>
}

type SectionLinkProps = { projectId: string; section: ProjectSection; isCurrent: boolean }

function SectionLink({ projectId, section, isCurrent }: SectionLinkProps): JSX.Element {
  const Glyph = section.icon

  return (
    <RouterLink
      href={sectionPath(projectId, section)}
      aria-current={ariaCurrentPage(isCurrent)}
      className={cn(
        'flex h-11 min-w-0 items-center gap-2 rounded-md px-2.5 text-base text-muted-foreground hover:bg-surface hover:text-foreground',
        isCurrent && 'bg-surface-hover font-medium text-foreground hover:bg-surface-hover',
      )}
    >
      <Glyph
        aria-hidden
        className={cn('size-5.5 shrink-0 transition-colors', isCurrent && 'text-brand')}
      />
      <span className="truncate">{section.label}</span>
    </RouterLink>
  )
}
