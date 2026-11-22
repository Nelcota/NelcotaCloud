import type { JSX, ReactNode } from 'react'

import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatusBadge, type StatusTone } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type Schemas = components['schemas']
type ProjectRole = Schemas['ProjectRole']

const ROLE_LABELS: Record<ProjectRole, string> = { owner: 'Dono', member: 'Membro' }
const ROLE_TONES: Record<ProjectRole, StatusTone> = { owner: 'brand', member: 'neutral' }

/** Id, slug, creation date and the viewer's role, in one row of facts under the name. */
export function ProjectFacts({
  project,
}: {
  project: Schemas['ProjectSummary'] | undefined
}): JSX.Element {
  if (project === undefined) {
    return <Skeleton className="h-16 rounded-none border-t" />
  }

  return (
    <dl className="grid gap-x-6 gap-y-4 border-t bg-surface/50 px-6 py-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto_auto]">
      <Fact label="ID do projeto">
        <IdChip label="ID do projeto" value={project.id} />
      </Fact>
      <Fact label="Slug">
        <IdChip label="Slug" value={project.slug} />
      </Fact>
      <Fact label="Criado em">
        <span className="text-sm">
          <Timestamp value={project.created_at} format="date" />
        </span>
      </Fact>
      <Fact label="Seu papel">
        <StatusBadge tone={ROLE_TONES[project.role]}>{ROLE_LABELS[project.role]}</StatusBadge>
      </Fact>
    </dl>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="grid min-w-0 content-start gap-1.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  )
}
