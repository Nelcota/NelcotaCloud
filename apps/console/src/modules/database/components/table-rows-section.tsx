import { List as Rows, Plus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { type RowsPage, isCountEstimated } from '@/modules/database/api/read-rows'
import { DataGrid } from '@/modules/database/components/data-grid'
import { RowEditorSheet } from '@/modules/database/components/row-editor-sheet'
import type { RowFilter } from '@/modules/database/components/row-filter'
import { RowsPagination } from '@/modules/database/components/rows-pagination'
import { RowsToolbar } from '@/modules/database/components/rows-toolbar'
import { type RowEditor, useRowEditor } from '@/modules/database/components/use-row-editor'
import { useTableCountQuery } from '@/modules/database/queries/use-table-count-query'
import { ROWS_PAGE_SIZE, useTableRowsQuery } from '@/modules/database/queries/use-table-rows-query'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { LoadError } from '@/shared/ui/load-error'
import { Button } from '@/shared/ui/primitives/button'
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

  if (page.data === undefined) {
    return <RowsLoading error={page.error} onRetry={() => page.refetch()} />
  }

  return (
    <section aria-label="Linhas" aria-busy={page.isPlaceholderData} className="flex flex-col gap-3">
      <LoadError error={page.error} onRetry={() => page.refetch()} />
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
        <RowsBody table={table} page={page.data} filters={filters} editor={editor} />
        <RowsPagination
          offset={page.data.offset}
          pageSize={ROWS_PAGE_SIZE}
          shown={page.data.rows.length}
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

type RowsBodyProps = {
  table: TableOverview
  page: RowsPage
  filters: readonly RowFilter[]
  editor: RowEditor
}

function RowsBody({ table, page, filters, editor }: RowsBodyProps): JSX.Element {
  const columns = table.columns

  // A later page can come back empty (rows deleted meanwhile): the footer keeps the way back.
  if (page.rows.length === 0 && page.offset === 0) {
    return <NoRows hasFilters={filters.length > 0} onInsert={editor.openNew} />
  }

  return (
    <DataGrid
      label={`Linhas de ${table.name}`}
      columns={columns}
      rows={page.rows.map((row) => columns.map((column) => row[column.name]))}
      rowOffset={page.offset}
      onRowOpen={editor.openRow}
    />
  )
}

type NoRowsProps = { hasFilters: boolean; onInsert?: () => void }

function NoRows({ hasFilters, onInsert }: NoRowsProps): JSX.Element {
  if (hasFilters) {
    return <EmptyState isCompact title="Nenhuma linha com esses filtros" />
  }

  return (
    <EmptyState
      isCompact
      icon={<Rows aria-hidden />}
      title="Nenhuma linha"
      description="Insira a primeira aqui, pelo Editor SQL ou pela API do app."
      actions={<InsertAction onInsert={onInsert} />}
    />
  )
}

function InsertAction({ onInsert }: { onInsert?: () => void }): JSX.Element | null {
  if (onInsert === undefined) {
    return null
  }

  return (
    <Button type="button" size="sm" onClick={onInsert}>
      <Plus aria-hidden data-icon="inline-start" />
      Inserir linha
    </Button>
  )
}
