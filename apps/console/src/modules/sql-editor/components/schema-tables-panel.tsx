import { type JSX, useState } from 'react'

import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { SqlSideSection } from '@/modules/sql-editor/components/sql-side-section'
import type { components } from '@/shared/api/api-schema'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SearchField } from '@/shared/ui/search-field'

type TableOverview = components['schemas']['TableOverview']

const COMPACT_COUNT = new Intl.NumberFormat('pt-BR', { notation: 'compact' })

type SchemaTablesPanelProps = {
  projectId: string
  /** Puts a query for that table in the editor. */
  onPick: (table: string) => void
}

/** The project's tables beside the editor, with their size; picking one starts a query on it. */
export function SchemaTablesPanel({ projectId, onPick }: SchemaTablesPanelProps): JSX.Element {
  const schema = useSchemaQuery(projectId)
  const [search, setSearch] = useState('')
  const filter = search.trim().toLowerCase()
  const tables = schema.data?.tables

  return (
    <SqlSideSection title="Tabelas" meta={tables?.length} isOpenByDefault>
      <div className="flex flex-col gap-2">
        <SearchField
          label="Buscar tabela"
          value={search}
          onValueChange={setSearch}
          className="sm:max-w-none"
        />
        <LoadError error={schema.error} onRetry={() => schema.refetch()} />
        <TablesContent
          tables={tables}
          isPending={schema.isPending}
          filter={filter}
          onPick={onPick}
        />
      </div>
    </SqlSideSection>
  )
}

type TablesContentProps = {
  tables: TableOverview[] | undefined
  isPending: boolean
  filter: string
  onPick: (table: string) => void
}

function TablesContent({
  tables,
  isPending,
  filter,
  onPick,
}: TablesContentProps): JSX.Element | null {
  if (isPending) {
    return <Skeleton className="h-40" />
  }

  if (tables === undefined) {
    return null
  }

  const shown = tables.filter((table) => table.name.toLowerCase().includes(filter))

  if (shown.length === 0) {
    return <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyText(tables.length)}</p>
  }

  return (
    <ul className="scrollbar-thin flex max-h-[28rem] flex-col overflow-y-auto">
      {shown.map((table) => (
        <li key={table.name}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left font-mono text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            onClick={() => onPick(table.name)}
          >
            <span className="truncate">{table.name}</span>
            <RowCount rows={table.estimated_rows} />
          </button>
        </li>
      ))}
    </ul>
  )
}

function emptyText(tableCount: number): string {
  if (tableCount > 0) {
    return 'Nenhuma tabela encontrada.'
  }

  return 'Nenhuma tabela ainda.'
}

/** Postgres's estimate, short ("48 mil"); empty when it has not counted the table yet. */
function RowCount({ rows }: { rows: number | null | undefined }): JSX.Element | null {
  if (rows === null || rows === undefined || rows < 0) {
    return null
  }

  return (
    <span className="shrink-0 font-sans text-xs text-muted-foreground tabular-nums">
      {COMPACT_COUNT.format(rows)}
    </span>
  )
}
