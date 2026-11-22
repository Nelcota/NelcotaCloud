import type { JSX } from 'react'

import { SqlError } from '@/modules/sql-editor/components/sql-error'
import { SqlExamplesList } from '@/modules/sql-editor/components/sql-examples-list'
import { SqlResultLoading } from '@/modules/sql-editor/components/sql-result-loading'
import { SqlResultView } from '@/modules/sql-editor/components/sql-result-view'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'

type SqlResult = components['schemas']['SqlResult']

type SqlResultPanelProps = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
  /** An empty box has nothing to run yet: the panel offers the examples instead. */
  isQueryEmpty: boolean
  onPickExample: (sql: string) => void
}

/** Inside the "Resultado" section: the grid of the last run, Postgres's refusal or the examples. */
export function SqlResultPanel(props: SqlResultPanelProps): JSX.Element {
  const { result, error } = props

  if (props.isRunning) {
    return <SqlResultLoading />
  }

  if (error !== null) {
    return <SqlError error={error} />
  }

  if (result !== undefined) {
    return <SqlResultView result={result} />
  }

  if (props.isQueryEmpty) {
    return <SqlExamplesList onPick={props.onPickExample} />
  }

  return <EmptyState isCompact title="Nenhuma consulta executada" />
}
