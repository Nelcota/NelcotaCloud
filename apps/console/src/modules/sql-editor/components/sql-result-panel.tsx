import type { JSX } from 'react'

import { SqlError } from '@/modules/sql-editor/components/sql-error'
import { SqlResultView } from '@/modules/sql-editor/components/sql-result-view'
import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

type SqlResultPanelProps = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
}

/** The grid of the last run, or Postgres's refusal; its status sits in the bar above. */
export function SqlResultPanel(props: SqlResultPanelProps): JSX.Element {
  return (
    <section aria-label="Resultado" className="flex min-h-40 min-w-0 flex-col">
      <h2 className="sr-only">Resultado</h2>
      <ResultBody {...props} />
    </section>
  )
}

function ResultBody({ result, error, isRunning }: SqlResultPanelProps): JSX.Element {
  if (error !== null) {
    return <SqlError error={error} />
  }

  if (result === undefined || isRunning) {
    return <p className="px-4 py-3 text-xs text-muted-foreground">{idleText(isRunning)}</p>
  }

  return <SqlResultView result={result} />
}

function idleText(isRunning: boolean): string {
  if (isRunning) {
    return 'Executando…'
  }

  return 'Nenhuma consulta executada.'
}
