import type { UseQueryResult } from '@tanstack/react-query'
import type { JSX } from 'react'
import { useState } from 'react'

import { type RowsPage, isCountEstimated } from '@/modules/database/api/read-rows'
import { DataGrid } from '@/modules/database/components/data-grid'
import { NoRows } from '@/modules/database/components/no-rows'
import { RowEditorSheet } from '@/modules/database/components/row-editor-sheet'
import type { RowFilter } from '@/modules/database/components/row-filter'
import { RowsFilterFailure } from '@/modules/database/components/rows-filter-failure'
import { RowsFooter } from '@/modules/database/components/rows-footer'
import { RowsToolbar } from '@/modules/database/components/rows-toolbar'
import { type RowEditor, useRowEditor } from '@/modules/database/components/use-row-editor'
import { useTableCountQuery } from '@/modules/database/queries/use-table-count-query'
import { ROWS_PAGE_SIZE, useTableRowsQuery } from '@/modules/database/queries/use-table-rows-query'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type TableOverview = components['schemas']['TableOverview']

type TableRowsSectionProps = { projectId: string; table: TableOverview }

/** The table's rows, 50 per page, sorted by the primary key, filtered and editable. */
export function TableRowsSection({ projectId, table }: TableRowsSectionProps): JSX.Element {
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState<RowFilter[]>([])
  const page = useTableRowsQuery(projectId, {
    table: table.name,
    offset,
    limit: ROWS_PAGE_SIZE,
    filters,
  })
  const estimatedRows = table.estimated_rows ?? null
  const total = useTableCountQuery(projectId, { table: table.name, estimatedRows, filters })
  const editor = useRowEditor(table, page.data)

  function changeFilters(next: RowFilter[]): void {
    setFilters(next)
    setOffset(0)
  }

  // Without filters a failed first load has nothing to undo; with them, the toolbar stays.
  if (page.data === undefined && filters.length === 0) {
    return <RowsLoading error={page.error} onRetry={() => page.refetch()} />
  }

  return (
    <section aria-label="Linhas" aria-busy={page.isPlaceholderData} className="flex flex-col gap-3">
      <LoadError error={refreshError(page)} onRetry={() => page.refetch()} />
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <RowsToolbar
          columns={table.columns}
          filters={filters}
          onFiltersChange={changeFilters}
          isRefreshing={page.isFetching && page.isPlaceholderData === false}
          onRefresh={() => {
            void page.refetch()
            void total.refetch()
          }}
          onInsert={editor.openNew}
        />
        <RowsContent
          table={table}
          page={page}
          filters={filters}
          editor={editor}
          onClearFilters={() => changeFilters([])}
        />
        <RowsFooter
          page={page.data}
          total={total.data ?? null}
          isTotalEstimated={isCountEstimated(estimatedRows)}
          isChangingPage={page.isPlaceholderData}
          onOffsetChange={setOffset}
        />
      </div>
      <RowEditorSheet
        projectId={projectId}
        table={table}
        target={editor.target}
        isOpen={editor.isOpen}
        onOpenChange={editor.setIsOpen}
      />
    </section>
  )
}

/** A failed refresh of rows already on screen; a failed first load is shown in their place. */
function refreshError(page: UseQueryResult<RowsPage>): Error | null {
  if (page.data === undefined) {
    return null
  }

  return page.error
}

type RowsLoadingProps = { error: Error | null; onRetry: () => void }

function RowsLoading({ error, onRetry }: RowsLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return (
    <div role="status" aria-label="Carregando linhas">
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

type RowsContentProps = {
  table: TableOverview
  page: UseQueryResult<RowsPage>
  filters: readonly RowFilter[]
  editor: RowEditor
  onClearFilters: () => void
}

function RowsContent(props: RowsContentProps): JSX.Element {
  const { table, page, filters, editor, onClearFilters } = props
  const rows = page.data

  if (rows === undefined && page.error !== null) {
    return <RowsFilterFailure error={page.error} onClearFilters={onClearFilters} />
  }

  if (rows === undefined) {
    return (
      <div role="status" aria-label="Carregando linhas" className="p-3">
        <Skeleton className="h-48 rounded-lg" />
      </div>
    )
  }

  // A later page can come back empty (rows deleted meanwhile): the footer keeps the way back.
  if (rows.rows.length === 0 && rows.offset === 0) {
    return (
      <NoRows
        hasFilters={filters.length > 0}
        onInsert={editor.openNew}
        onClearFilters={onClearFilters}
      />
    )
  }

  const columns = table.columns

  return (
    <DataGrid
      label={`Linhas de ${table.name}`}
      columns={columns}
      rows={rows.rows.map((row) => columns.map((column) => row[column.name]))}
      rowOffset={rows.offset}
      onRowOpen={editor.openRow}
    />
  )
}
