import { Table } from 'lucide-react'
import { type JSX, useId, useState } from 'react'

import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SearchField } from '@/shared/ui/search-field'

type TableOverview = components['schemas']['TableOverview']

const TABLE_ITEM =
  'flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-start text-sm text-muted-foreground transition-colors duration-200 ease-standard hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring'

type SchemaTablesPanelProps = {
  projectId: string
  /** Opens a query for that table in the editor. */
  onPick: (table: string) => void
}

/** The project's tables beside the editor, with their size; picking one starts a query on it. */
export function SchemaTablesPanel({ projectId, onPick }: SchemaTablesPanelProps): JSX.Element {
  const schema = useSchemaQuery(projectId)
  const [search, setSearch] = useState('')
  const titleId = useId()
  const tables = schema.data?.tables

  return (
    <aside aria-labelledby={titleId} className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <h2 id={titleId} className="type-label flex items-center gap-1.5 px-2 text-muted-foreground">
        Tabelas
        <span className="tabular-nums">{tables?.length}</span>
      </h2>
      <SearchField
        label="Buscar tabela"
        value={search}
        onValueChange={setSearch}
        className="h-9 sm:max-w-none"
      />
      <LoadError error={schema.error} onRetry={() => schema.refetch()} />
      <TablesContent tables={tables} isPending={schema.isPending} search={search} onPick={onPick} />
    </aside>
  )
}

type TablesContentProps = {
  tables: TableOverview[] | undefined
  isPending: boolean
  search: string
  onPick: (table: string) => void
}

function TablesContent({
  tables,
  isPending,
  search,
  onPick,
}: TablesContentProps): JSX.Element | null {
  if (isPending) {
    return <Skeleton className="h-40" />
  }

  if (tables === undefined) {
    return null
  }

  const filter = search.trim().toLowerCase()
  const shown = tables.filter((table) => table.name.toLowerCase().includes(filter))

  if (shown.length === 0) {
    return <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyText(tables.length)}</p>
  }

  return (
    <ul className="scrollbar-thin flex max-h-72 min-h-0 flex-col overflow-y-auto @min-[52rem]:max-h-none @min-[52rem]:flex-1">
      {shown.map((table) => (
        <li key={table.name}>
          <button
            type="button"
            title={`Consultar ${table.name}`}
            className={TABLE_ITEM}
            onClick={() => onPick(table.name)}
          >
            <Table aria-hidden className="size-4.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{table.name}</span>
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

/** Postgres's estimate, short ("48,2 mil"); empty when it has not counted the table yet. */
function RowCount({ rows }: { rows: number | null | undefined }): JSX.Element | null {
  if (rows === null || rows === undefined || rows < 0) {
    return null
  }

  return (
    <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
      {formatCount(rows)}
    </span>
  )
}
