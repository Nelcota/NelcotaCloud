import { SquareCode as CodeSquare } from 'lucide-react'
import type { JSX } from 'react'

import { RlsBadge } from '@/modules/database/components/rls-badge'
import { restUrl } from '@/modules/database/components/snippet-syntax'
import { TableApiSheet } from '@/modules/database/components/table-api-sheet'
import { estimatedRowsLabel, kindLabel } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'
import { IdChip } from '@/shared/ui/id-chip'
import { PageHeader } from '@/shared/ui/page-header'
import { Badge } from '@/shared/ui/primitives/badge'
import { Button } from '@/shared/ui/primitives/button'
import { StatusBadge } from '@/shared/ui/status-badge'

type TableOverview = components['schemas']['TableOverview']

type TableHeadingProps = { projectId: string; table: TableOverview }

/** The table's name in the code font, its schema, kind and protection, its endpoint and code. */
export function TableHeading({ projectId, table }: TableHeadingProps): JSX.Element {
  return (
    <div className="[&_h1]:font-mono">
      <PageHeader
        title={table.name}
        description={<TableFacts table={table} />}
        actions={
          <>
            <TableApiSheet projectId={projectId} table={table} />
            <Button asChild variant="outline">
              <RouterLink href={`/projects/${projectId}/sql`}>
                <CodeSquare aria-hidden data-icon="inline-start" />
                Editor SQL
              </RouterLink>
            </Button>
          </>
        }
      >
        <div className="flex min-w-0">
          <IdChip label="Endpoint" value={restUrl(encodeURIComponent(table.name))} isLabelVisible />
        </div>
      </PageHeader>
    </div>
  )
}

function TableFacts({ table }: { table: TableOverview }): JSX.Element {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5">
      <Badge variant="muted" className="font-mono" title="Schema">
        public
      </Badge>
      <StatusBadge>{kindLabel(table.kind)}</StatusBadge>
      <RlsBadge table={table} />
      <RowsEstimate table={table} />
    </span>
  )
}

function RowsEstimate({ table }: { table: TableOverview }): JSX.Element | null {
  const label = estimatedRowsLabel(table)

  if (label === null) {
    return null
  }

  return <span className="ms-1 text-xs text-muted-foreground tabular-nums">{label}</span>
}
