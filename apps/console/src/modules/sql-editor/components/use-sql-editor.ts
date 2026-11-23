import type { KeyboardEvent } from 'react'
import { useRef, useState } from 'react'

import { destructiveStatements } from '@/modules/sql-editor/components/destructive-statement'
import { loadSavedQuery, saveQuery } from '@/modules/sql-editor/components/saved-query'
import {
  type HistorySteps,
  useHistorySteps,
} from '@/modules/sql-editor/components/use-history-steps'
import { useSqlHistory } from '@/modules/sql-editor/components/use-sql-history'
import { useRunSqlMutation } from '@/modules/sql-editor/queries/use-run-sql-mutation'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

export type SqlOutcome = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
  durationMs: number | null
}

/** A run waiting for a yes because it erases data; `statements` names what it would run. */
export type PendingRun = { text: string; statements: string[] }

export type SqlEditorState = {
  query: string
  /** Typing in the box. */
  change: (sql: string) => void
  /** A query picked from the tables, examples or history; it replaces the text. */
  pick: (sql: string) => void
  hasSelection: boolean
  setSelected: (text: string) => void
  outcome: SqlOutcome
  /** Back and forward through the queries run here. */
  steps: HistorySteps
  execute: () => void
  /** The destructive run waiting for confirmation, if any. */
  pendingRun: PendingRun | null
  confirmRun: () => void
  cancelRun: () => void
  /** Ctrl/Cmd+Enter from anywhere inside the element that receives it. */
  runOnShortcut: (event: KeyboardEvent<HTMLElement>) => void
}

/** The SQL box's text, selection, last run and history, saved per project in this browser. */
export function useSqlEditor(projectId: string): SqlEditorState {
  const [query, setQuery] = useState(() => loadSavedQuery(projectId))
  const [selected, setSelected] = useState('')
  const [durationMs, setDurationMs] = useState<number | null>(null)
  const [pendingRun, setPendingRun] = useState<PendingRun | null>(null)
  const startedAt = useRef(0)
  const run = useRunSqlMutation(projectId)
  const history = useSqlHistory(projectId)
  const steps = useHistorySteps({ entries: history.entries, shownSql: query, show })

  function save(value: string): void {
    setQuery(value)
    saveQuery(projectId, value)
  }

  // A shown or picked query replaces the text, so an old selection no longer points at anything.
  function show(sql: string): void {
    setSelected('')
    save(sql)
  }

  function change(value: string): void {
    steps.reset()
    save(value)
  }

  function pick(sql: string): void {
    steps.reset()
    show(sql)
  }

  function execute(): void {
    const text = runText(query, selected)

    if (text.trim() === '' || run.isPending) {
      return
    }

    const statements = destructiveStatements(text)

    if (statements.length > 0) {
      setPendingRun({ text, statements })
      return
    }

    runNow(text)
  }

  function confirmRun(): void {
    if (pendingRun === null) {
      return
    }

    setPendingRun(null)
    runNow(pendingRun.text)
  }

  function runNow(text: string): void {
    history.record(text)
    steps.reset()
    startedAt.current = performance.now()
    setDurationMs(null)
    run.mutate(text, { onSuccess: () => setDurationMs(performance.now() - startedAt.current) })
  }

  function runOnShortcut(event: KeyboardEvent<HTMLElement>): void {
    if (
      event.nativeEvent.isComposing ||
      event.key !== 'Enter' ||
      (event.ctrlKey || event.metaKey) === false
    ) {
      return
    }

    event.preventDefault()
    execute()
  }

  return {
    query,
    change,
    pick,
    hasSelection: selected.trim() !== '',
    setSelected,
    outcome: { result: run.data, error: run.error, isRunning: run.isPending, durationMs },
    steps,
    execute,
    pendingRun,
    confirmRun,
    cancelRun: () => setPendingRun(null),
    runOnShortcut,
  }
}

/** The selected text when there is one, the whole box otherwise. */
function runText(query: string, selected: string): string {
  if (selected.trim() !== '') {
    return selected
  }

  return query
}
