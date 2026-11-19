import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import {
  PROJECT_SECTIONS,
  type ProjectGroup,
  type ProjectSection,
  sectionPath,
} from '@/app/shell/project-sections'
import { SectionCount } from '@/app/shell/section-count'
import { SIDEBAR_ITEM, SIDEBAR_ITEM_CURRENT } from '@/app/shell/sidebar-item'
import { cn } from '@/shared/lib/class-names'

type ProjectNavProps = {
  projectId: string
  currentSection: ProjectSection
  group: ProjectGroup
  onNavigate?: () => void
}

/** One group of a project's pages. */
export function ProjectNav(props: ProjectNavProps): JSX.Element {
  const sections = PROJECT_SECTIONS.filter((section) => section.group === props.group)

  return (
    <ul className="grid gap-0.5">
      {sections.map((section) => (
        <li key={section.segment}>
          <SectionLink
            projectId={props.projectId}
            section={section}
            isCurrent={section === props.currentSection}
            onNavigate={props.onNavigate}
          />
        </li>
      ))}
    </ul>
  )
}

type SectionLinkProps = {
  projectId: string
  section: ProjectSection
  isCurrent: boolean
  onNavigate?: () => void
}

function SectionLink({ projectId, section, isCurrent, onNavigate }: SectionLinkProps): JSX.Element {
  return (
    <Link
      to={sectionPath(projectId, section)}
      onClick={onNavigate}
      aria-current={ariaCurrent(isCurrent)}
      className={cn(SIDEBAR_ITEM, isCurrent && SIDEBAR_ITEM_CURRENT)}
    >
      <SectionIcon section={section} isCurrent={isCurrent} />
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
      <SectionCount projectId={projectId} segment={section.segment} />
    </Link>
  )
}

function SectionIcon({
  section,
  isCurrent,
}: {
  section: ProjectSection
  isCurrent: boolean
}): JSX.Element {
  if (isCurrent) {
    return <section.currentIcon className="text-primary-ink size-5 shrink-0" />
  }

  return <section.icon className="text-muted-foreground size-5 shrink-0" />
}

function ariaCurrent(isCurrent: boolean): 'page' | undefined {
  if (isCurrent) {
    return 'page'
  }

  return undefined
}
