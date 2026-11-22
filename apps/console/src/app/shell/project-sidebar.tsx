import type { JSX } from 'react'

import { ProjectSwitcher } from '@/app/shell/project-switcher'
import {
  PROJECT_GROUPS,
  type ProjectLocation,
  sectionPath,
  sectionsOf,
} from '@/app/shell/project-sections'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'

/** The open project at the top, then its pages in groups. */
export function ProjectSidebar({ location }: { location: ProjectLocation }): JSX.Element {
  return (
    <div className="flex flex-col gap-5 p-3">
      <ProjectSwitcher projectId={location.projectId} />
      {PROJECT_GROUPS.map((group) => (
        <div key={group.id} className="grid gap-0.5">
          {group.label !== null && (
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
          )}
          <ul className="grid gap-0.5">
            {sectionsOf(group.id).map((section) => {
              const isCurrent = section === location.section
              const Glyph = section.icon

              return (
                <li key={section.segment}>
                  <RouterLink
                    href={sectionPath(location.projectId, section)}
                    aria-current={isCurrent ? 'page' : undefined}
                    className={cn(
                      'flex h-10 min-w-0 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground',
                      isCurrent && 'bg-surface-hover font-medium text-foreground',
                    )}
                  >
                    <Glyph aria-hidden className="size-[1.125rem] shrink-0" />
                    <span className="truncate">{section.label}</span>
                  </RouterLink>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
