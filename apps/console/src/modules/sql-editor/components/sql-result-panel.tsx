import type { JSX } from 'react'

import { SqlError } from '@/modules/sql-editor/components/sql-error'
import { SqlResultStatus } from '@/modules/sql-editor/components/sql-result-status'
import { SqlResultView } from '@/modules/sql-editor/components/sql-result-view'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

type SqlResultPanelProps = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
  durationMs: number | null
}

/** The results panel: a status strip over the grid, or Postgres's refusal. */
export function SqlResultPanel(props: SqlResultPanelProps): JSX.Element {
  return (
    <section
      aria-label="Resultado"
      className="flex min-h-48 min-w-0 flex-col overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-surface px-4 py-2">
        <h2 className="text-base font-semibold">Resultado</h2>
        <SqlResultStatus {...props} />
      </div>
      <ResultBody {...props} />
    </section>
  )
}

function ResultBody({ result, error, isRunning }: SqlResultPanelProps): JSX.Element {
  if (error !== null) {
    return <SqlError error={error} />
  }

  if (result === undefined || isRunning) {
    return <p className="p-4 text-sm text-muted-foreground">{idleText(isRunning)}</p>
  }

  return <SqlResultView result={result} />
}

function idleText(isRunning: boolean): string {
  if (isRunning) {
    return 'Executando…'
  }

  return 'Execute uma consulta para ver o resultado aqui.'
}
