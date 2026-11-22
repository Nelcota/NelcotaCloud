import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { Timestamp } from '@/shared/ui/timestamp'

type Schemas = components['schemas']

const ROLE_LABELS: Record<Schemas['ProjectRole'], string> = {
  owner: 'Dono',
  member: 'Membro',
  viewer: 'Leitura',
}

/** The facts that never change here: the slug, when the project was created and the viewer's role. */
export function ProjectMeta({
  project,
}: {
  project: Schemas['ProjectSummary'] | undefined
}): JSX.Element {
  if (project === undefined) {
    return <Skeleton className="h-4 w-56" />
  }

  return (
    <span className="flex flex-wrap items-center gap-x-1.5">
      <code className="font-mono text-foreground">{project.slug}</code>
      <span aria-hidden>·</span>
      <span className="tabular-nums">
        Criado em <Timestamp value={project.created_at} format="date" />
      </span>
      <span aria-hidden>·</span>
      <span>{ROLE_LABELS[project.role]}</span>
    </span>
  )
}
