import Play from '~icons/solar/play-linear'
import type { JSX, KeyboardEvent } from 'react'
import { useId, useState } from 'react'

import { loadSavedQuery, saveQuery } from '@/modules/database/sql-editor/model/saved-query'
import { SqlResultView } from '@/modules/database/sql-editor/components/sql-result-view'
import { useRunSqlMutation } from '@/modules/database/sql-editor/queries/use-run-sql-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

/** A SQL box run with the button or Ctrl/Cmd+Enter, with the result or Postgres's refusal below. */
export function SqlEditor({ projectId }: { projectId: string }): JSX.Element {
  const editorId = useId()
  const [query, setQuery] = useState(() => loadSavedQuery(projectId))
  const run = useRunSqlMutation(projectId)

  function change(value: string): void {
    setQuery(value)
    saveQuery(projectId, value)
  }

  function execute(): void {
    if (query.trim() === '' || run.isPending) {
      return
    }

    run.mutate(query)
  }

  function runOnShortcut(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== 'Enter' || (event.ctrlKey || event.metaKey) === false) {
      return
    }

    event.preventDefault()
    execute()
  }

  return (
    <div className="grid gap-4">
      <label htmlFor={editorId} className="sr-only">
        SQL
      </label>
      <div className="bg-card border-border focus-within:border-ring focus-within:ring-ring/50 grid rounded-3xl border transition-shadow focus-within:ring-3">
        <textarea
          id={editorId}
          rows={10}
          spellCheck={false}
          autoComplete="off"
          aria-keyshortcuts="Control+Enter Meta+Enter"
          value={query}
          onChange={(event) => change(event.target.value)}
          onKeyDown={runOnShortcut}
          className="min-h-48 w-full resize-y bg-transparent px-5 pt-4 pb-2 font-mono text-sm leading-relaxed outline-none"
        />
        <div className="flex items-center justify-end gap-3 px-3 pb-3">
          <kbd className="text-muted-foreground font-mono text-xs">{shortcutLabel()}</kbd>
          <Button
            disabled={query.trim() === '' || run.isPending}
            aria-busy={run.isPending}
            onClick={execute}
          >
            <Play />
            Executar
          </Button>
        </div>
      </div>
      <ErrorAlert error={run.error} />
      <SqlResultView result={run.data} />
    </div>
  )
}

function shortcutLabel(): string {
  if (navigator.userAgent.includes('Mac')) {
    return '⌘ Enter'
  }

  return 'Ctrl Enter'
}
