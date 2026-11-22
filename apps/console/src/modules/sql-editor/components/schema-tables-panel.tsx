import { Table } from 'lucide-react'
import { type JSX, useState } from 'react'

import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import { SqlSideSection } from '@/modules/sql-editor/components/sql-side-section'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SearchField } from '@/shared/ui/search-field'

type TableOverview = components['schemas']['TableOverview']

const SIDE_ITEM =
  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-muted-foreground transition-[color,background-color,scale] duration-200 ease-standard hover:bg-surface-hover hover:text-foreground'

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
    <SqlSideSection title="Tabelas" meta={tables?.length}>
      <SearchField
        label="Buscar tabela"
        value={search}
        onValueChange={setSearch}
        className="mb-1 sm:max-w-none"
      />
      <LoadError error={schema.error} onRetry={() => schema.refetch()} />
      <TablesContent tables={tables} isPending={schema.isPending} filter={filter} onPick={onPick} />
    </SqlSideSection>
  )
}

type TablesContentProps = {
  tables: TableOverview[] | undefined
  isPending: boolean
  filter: string
  onPick: (table: string) => void
}

function TablesContent(props: TablesContentProps): JSX.Element | null {
  const { tables, onPick } = props

  if (props.isPending) {
    return <Skeleton className="h-32" />
  }

  if (tables === undefined) {
    return null
  }

  const shown = tables.filter((table) => table.name.toLowerCase().includes(props.filter))

  if (shown.length === 0) {
    return <p className="px-2 py-1.5 text-xs text-muted-foreground">{emptyText(tables.length)}</p>
  }

  return (
    <ul className="scrollbar-thin flex max-h-[22rem] flex-col overflow-y-auto">
      {shown.map((table) => (
        <li key={table.name}>
          <button type="button" className={SIDE_ITEM} onClick={() => onPick(table.name)}>
            <Table aria-hidden className="size-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-mono text-xs">{table.name}</span>
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
    <span className="shrink-0 text-2xs text-muted-foreground tabular-nums">
      {formatCount(rows)}
    </span>
  )
}
