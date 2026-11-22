import type { JSX } from 'react'
import { useRef, useState } from 'react'

import { loadSavedQuery, saveQuery } from '@/modules/sql-editor/components/saved-query'
import { SchemaTablesPanel } from '@/modules/sql-editor/components/schema-tables-panel'
import { SqlHistoryPanel } from '@/modules/sql-editor/components/sql-history-panel'
import { SqlExamplesPanel } from '@/modules/sql-editor/components/sql-examples-panel'
import { SqlQueryPanel } from '@/modules/sql-editor/components/sql-query-panel'
import { SqlResultPanel } from '@/modules/sql-editor/components/sql-result-panel'
import { tableQuery } from '@/modules/sql-editor/components/table-query'
import { useSqlHistory } from '@/modules/sql-editor/components/use-sql-history'
import { useRunSqlMutation } from '@/modules/sql-editor/queries/use-run-sql-mutation'

/**
 * The SQL box above its result, with the project's tables, ready examples and the last queries
 * beside them; a query runs with the button or Ctrl/Cmd+Enter.
 */
export function SqlEditor({ projectId }: { projectId: string }): JSX.Element {
  const [query, setQuery] = useState(() => loadSavedQuery(projectId))
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const startedAt = useRef(0)
  const run = useRunSqlMutation(projectId)
  const history = useSqlHistory(projectId)

  function change(value: string): void {
    setQuery(value)
    saveQuery(projectId, value)
  }

  function execute(): void {
    if (query.trim() === '' || run.isPending) {
      return
    }

    history.record(query)
    startedAt.current = performance.now()
    setDurationMs(null)
    run.mutate(query, { onSuccess: () => setDurationMs(performance.now() - startedAt.current) })
  }

  return (
    <div className="@container">
      <div className="grid items-start gap-6 @min-[52rem]:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <SqlQueryPanel
            query={query}
            isRunning={run.isPending}
            onChange={change}
            onRun={execute}
          />
          <SqlResultPanel
            result={run.data}
            error={run.error}
            isRunning={run.isPending}
            durationMs={durationMs}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-xl border bg-card p-2">
          <SchemaTablesPanel projectId={projectId} onPick={(table) => change(tableQuery(table))} />
          <SqlExamplesPanel onPick={change} />
          <SqlHistoryPanel entries={history.entries} onPick={change} />
        </div>
      </div>
    </div>
  )
}
