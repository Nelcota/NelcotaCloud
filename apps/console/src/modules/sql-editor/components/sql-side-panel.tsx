import type { JSX } from 'react'

import { SchemaTablesPanel } from '@/modules/sql-editor/components/schema-tables-panel'
import type { SqlHistoryEntry } from '@/modules/sql-editor/components/sql-history'
import { SqlExamplesPanel } from '@/modules/sql-editor/components/sql-examples-panel'
import { SqlHistoryPanel } from '@/modules/sql-editor/components/sql-history-panel'
import { tableQuery } from '@/modules/sql-editor/components/table-query'

type SqlSidePanelProps = {
  projectId: string
  history: SqlHistoryEntry[]
  /** Replaces the editor's text; nothing runs by itself. */
  onPick: (sql: string) => void
}

/** The editor's secondary sidebar: the tables, ready examples and the last queries. */
export function SqlSidePanel({ projectId, history, onPick }: SqlSidePanelProps): JSX.Element {
  return (
    <aside
      aria-label="Tabelas, exemplos e histórico"
      className="flex min-w-0 flex-col gap-5 @min-[52rem]:order-first"
    >
      <SchemaTablesPanel projectId={projectId} onPick={(table) => onPick(tableQuery(table))} />
      <SqlExamplesPanel onPick={onPick} />
      <SqlHistoryPanel entries={history} onPick={onPick} />
    </aside>
  )
}
