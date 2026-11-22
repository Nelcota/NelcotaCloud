import Rows from '~icons/solar/list-linear'
import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { type RowsPage, isCountEstimated } from '@/modules/database/api/read-rows'
import { DataGrid } from '@/modules/database/components/data-grid'
import { RowsToolbar } from '@/modules/database/components/rows-toolbar'
import { RowsPagination } from '@/modules/database/components/rows-pagination'
import { useTableCountQuery } from '@/modules/database/queries/use-table-count-query'
import { ROWS_PAGE_SIZE, useTableRowsQuery } from '@/modules/database/queries/use-table-rows-query'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type TableOverview = components['schemas']['TableOverview']

type TableRowsSectionProps = { projectId: string; table: TableOverview }

/** The table's rows, 50 per page, sorted by the primary key when one exists. */
export function TableRowsSection({ projectId, table }: TableRowsSectionProps): JSX.Element {
  const [offset, setOffset] = useState(0)
  const page = useTableRowsQuery(projectId, {
    table: table.name,
    offset,
    limit: ROWS_PAGE_SIZE,
  })
  const total = useTableCountQuery(projectId, {
    table: table.name,
    estimatedRows: table.estimated_rows ?? null,
  })
  const toolbar = (
    <RowsToolbar
      isRefreshing={page.isFetching && page.isPlaceholderData === false}
      onRefresh={() => {
        void page.refetch()
        void total.refetch()
      }}
    />
  )
  const footer = (
    <RowsPagination
      offset={page.data?.offset ?? offset}
      pageSize={ROWS_PAGE_SIZE}
      shown={page.data?.rows.length ?? 0}
      total={total.data ?? null}
      isTotalEstimated={isCountEstimated(table.estimated_rows ?? null)}
      isChangingPage={page.isPlaceholderData}
      onOffsetChange={setOffset}
    />
  )

  return (
    <section aria-label="Linhas" aria-busy={page.isPlaceholderData} className="flex flex-col gap-3">
      <LoadError error={page.error} onRetry={() => page.refetch()} />
      <RowsContent
        table={table}
        page={page.data}
        hasFailed={page.isError}
        frame={{ toolbar, footer }}
      />
    </section>
  )
}

type RowsContentProps = {
  table: TableOverview
  page: RowsPage | undefined
  hasFailed: boolean
  /** The bars above and below the grid. */
  frame: { toolbar: ReactNode; footer: ReactNode }
}

function RowsContent({ table, page, hasFailed, frame }: RowsContentProps): JSX.Element | null {
  if (page === undefined && hasFailed) {
    return null
  }

  if (page === undefined) {
    return (
      <div role="status" aria-label="Carregando linhas">
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  // A later page can come back empty (rows deleted meanwhile): keep the way back to the first.
  if (page.rows.length === 0 && page.offset === 0) {
    return (
      <EmptyState
        isFramed
        icon={<Rows aria-hidden />}
        title="Nenhuma linha"
        description="Insira linhas pelo Editor SQL ou pela API do app."
      />
    )
  }

  const columns = table.columns

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {frame.toolbar}
      <DataGrid
        label={`Linhas de ${table.name}`}
        columns={columns}
        rows={page.rows.map((row) => columns.map((column) => row[column.name]))}
        rowOffset={page.offset}
      />
      {frame.footer}
    </div>
  )
}
