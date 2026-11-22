import type { JSX } from 'react'

import { HealthPill } from '@/modules/overview/components/health-pill'
import type { ProjectHealth } from '@/modules/overview/components/project-health'

type ProjectStateProps = { slug: string | undefined; health: ProjectHealth }

/** Under the project's name: its slug as a mono pill (like a service's branch) and its state. */
export function ProjectState({ slug, health }: ProjectStateProps): JSX.Element {
  return (
    <span className="flex flex-wrap items-center gap-2 pt-1">
      <SlugPill slug={slug} />
      <HealthPill health={health} />
    </span>
  )
}

function SlugPill({ slug }: { slug: string | undefined }): JSX.Element | null {
  if (slug === undefined) {
    return null
  }

  return (
    <span className="inline-flex h-5 items-center rounded-[6px] bg-surface-hover px-2 font-mono text-2xs text-foreground">
      {slug}
    </span>
  )
}
