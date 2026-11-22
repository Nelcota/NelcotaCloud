import type { JSX } from 'react'
import { useRef, useState } from 'react'

import { loadSavedQuery, saveQuery } from '@/modules/sql-editor/components/saved-query'
import { SqlQueryPanel } from '@/modules/sql-editor/components/sql-query-panel'
import { SqlResultPanel } from '@/modules/sql-editor/components/sql-result-panel'
import { SqlResultStatus } from '@/modules/sql-editor/components/sql-result-status'
import { SqlSidePanel } from '@/modules/sql-editor/components/sql-side-panel'
import { useSqlHistory } from '@/modules/sql-editor/components/use-sql-history'
import { useRunSqlMutation } from '@/modules/sql-editor/queries/use-run-sql-mutation'

/**
 * The SQL box above its result, with the project's tables, ready examples and the last queries
 * in a sidebar beside them; a query runs with the button or Ctrl/Cmd+Enter.
 */
export function SqlEditor({ projectId }: { projectId: string }): JSX.Element {
  const [query, setQuery] = useState(() => loadSavedQuery(projectId))
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const startedAt = useRef(0)
  const run = useRunSqlMutation(projectId)
  const history = useSqlHistory(projectId)
  const outcome = { result: run.data, error: run.error, isRunning: run.isPending }

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
      <div className="grid items-start gap-5 @min-[52rem]:grid-cols-[15rem_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
          <SqlQueryPanel
            query={query}
            isRunning={run.isPending}
            status={<SqlResultStatus {...outcome} durationMs={durationMs} />}
            onChange={change}
            onRun={execute}
          />
          <SqlResultPanel {...outcome} />
        </div>
        <SqlSidePanel projectId={projectId} history={history.entries} onPick={change} />
      </div>
    </div>
  )
}
