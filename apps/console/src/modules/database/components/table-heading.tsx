import CodeSquare from '~icons/solar/code-square-linear'
import type { JSX } from 'react'

import { RlsBadge } from '@/modules/database/components/rls-badge'
import { restUrl } from '@/modules/database/components/snippet-syntax'
import { TableApiSheet } from '@/modules/database/components/table-api-sheet'
import { kindLabel } from '@/modules/database/components/table-kinds'
import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'
import { IdChip } from '@/shared/ui/id-chip'
import { PageHeader } from '@/shared/ui/page-header'
import { Button } from '@/shared/ui/primitives/button'
import { StatusBadge } from '@/shared/ui/status-badge'

type TableOverview = components['schemas']['TableOverview']

type TableHeadingProps = { projectId: string; table: TableOverview }

/** The table's name in the code font, its kind and protection, its endpoint and code. */
export function TableHeading({ projectId, table }: TableHeadingProps): JSX.Element {
  return (
    <div className="[&_h1]:font-mono [&_h1]:text-2xl">
      <PageHeader
        title={table.name}
        description={
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge>{kindLabel(table.kind)}</StatusBadge>
            <RlsBadge table={table} />
          </span>
        }
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
