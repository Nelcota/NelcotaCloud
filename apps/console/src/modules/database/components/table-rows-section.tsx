import Rows from '~icons/solar/list-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import type { RowsPage } from '@/modules/database/api/read-rows'
import { DataGrid } from '@/modules/database/components/data-grid'
import { RowsPagination } from '@/modules/database/components/rows-pagination'
import { useTableCountQuery } from '@/modules/database/queries/use-table-count-query'
import { ROWS_PAGE_SIZE, useTableRowsQuery } from '@/modules/database/queries/use-table-rows-query'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'

type TableOverview = components['schemas']['TableOverview']

type TableRowsSectionProps = { projectId: string; table: TableOverview }

/** The table's rows, 50 per page, sorted by the primary key so pages stay stable. */
export function TableRowsSection({ projectId, table }: TableRowsSectionProps): JSX.Element {
  const [offset, setOffset] = useState(0)
  const page = useTableRowsQuery(projectId, {
    table: table.name,
    offset,
    limit: ROWS_PAGE_SIZE,
    orderColumn: orderColumnOf(table),
  })
  const total = useTableCountQuery(projectId, {
    table: table.name,
    estimatedRows: table.estimated_rows ?? null,
  })

  return (
    <div className="grid gap-3">
      <LoadError error={page.error} onRetry={() => page.refetch()} />
      <RowsContent table={table} page={page.data} hasFailed={page.isError} />
      <RowsPagination
        offset={offset}
        pageSize={ROWS_PAGE_SIZE}
        shown={page.data?.rows.length ?? 0}
        total={total.data?.count ?? null}
        isTotalEstimated={total.data?.mode === 'planned'}
        onOffsetChange={setOffset}
      />
    </div>
  )
}

type RowsContentProps = { table: TableOverview; page: RowsPage | undefined; hasFailed: boolean }

function RowsContent({ table, page, hasFailed }: RowsContentProps): JSX.Element | null {
  if (page === undefined && hasFailed) {
    return null
  }

  if (page === undefined) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  if (page.rows.length === 0) {
    return (
      <EmptyState
        icon={Rows}
        title="Nenhuma linha"
        description="Insira linhas pelo editor SQL ou pela API do app."
      />
    )
  }

  const columns = table.columns

  return (
    <DataGrid
      label={`Linhas de ${table.name}`}
      columns={columns}
      rows={page.rows.map((row) => columns.map((column) => row[column.name]))}
    />
  )
}

/** The primary key, or else the first column; a table without columns is read unsorted. */
function orderColumnOf(table: TableOverview): string | null {
  const columns = table.columns
  const primaryKey = columns.find((column) => column.is_primary_key)

  return primaryKey?.name ?? columns.at(0)?.name ?? null
}
