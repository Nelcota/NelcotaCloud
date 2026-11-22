import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { CopyButton } from '@/shared/ui/copy-button'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatusBadge, type StatusTone } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type Schemas = components['schemas']
type ProjectRole = Schemas['ProjectRole']

const ROLE_LABELS: Record<ProjectRole, string> = { owner: 'Dono', member: 'Membro' }
const ROLE_TONES: Record<ProjectRole, StatusTone> = { owner: 'neutral', member: 'neutral' }

/** Id, slug, creation date and the viewer's role, as read-only facts under the name. */
export function ProjectFacts({
  project,
}: {
  project: Schemas['ProjectSummary'] | undefined
}): JSX.Element {
  if (project === undefined) {
    return <Skeleton className="h-40 rounded-lg" />
  }

  return (
    <DataList className="-my-2.5">
      <DataListItem label="ID do projeto">
        <CopyableFact label="ID do projeto" value={project.id} />
      </DataListItem>
      <DataListItem label="Identificador">
        <CopyableFact label="Identificador" value={project.slug} />
      </DataListItem>
      <DataListItem label="Criado em">
        <span className="tabular-nums">
          <Timestamp value={project.created_at} format="date" />
        </span>
      </DataListItem>
      <DataListItem label="Seu papel">
        <StatusBadge tone={ROLE_TONES[project.role]}>{ROLE_LABELS[project.role]}</StatusBadge>
      </DataListItem>
    </DataList>
  )
}

function CopyableFact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <span className="-my-1 flex min-w-0 items-center gap-1">
      <code className="min-w-0 truncate font-mono" title={value}>
        {value}
      </code>
      <CopyButton value={value} description={label} isIconOnly />
    </span>
  )
}
