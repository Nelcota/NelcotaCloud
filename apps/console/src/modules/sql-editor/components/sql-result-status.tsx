import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type SqlResult = components['schemas']['SqlResult']

type SqlResultStatusProps = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
  durationMs: number | null
}

const DURATION = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** Rows, time and truncation of the last run, announced when they change. */
export function SqlResultStatus(props: SqlResultStatusProps): JSX.Element {
  return (
    <p
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums"
    >
      <StatusItems {...props} />
    </p>
  )
}

function StatusItems({
  result,
  error,
  isRunning,
  durationMs,
}: SqlResultStatusProps): JSX.Element | null {
  if (isRunning || error !== null || result === undefined) {
    return null
  }

  return (
    <>
      <span>{rowsText(result)}</span>
      <Duration durationMs={durationMs} />
      <TruncatedNote result={result} />
    </>
  )
}

function Duration({ durationMs }: { durationMs: number | null }): JSX.Element | null {
  if (durationMs === null) {
    return null
  }

  return <span>{DURATION.format(durationMs)} ms</span>
}

function TruncatedNote({ result }: { result: SqlResult }): JSX.Element | null {
  if (result.is_truncated === false) {
    return null
  }

  return (
    <span className="text-warning">
      Mostrando as primeiras {result.rows.length.toLocaleString('pt-BR')}
    </span>
  )
}

/** A statement without a result set says what it changed instead. */
function rowsText(result: SqlResult): string {
  if (result.columns.length > 0) {
    return countText(result.row_count, 'linha', 'linhas')
  }

  if (result.rows_affected === 0) {
    return 'Executado'
  }

  return `Executado: ${countText(result.rows_affected, 'linha afetada', 'linhas afetadas')}`
}

function countText(count: number, singular: string, plural: string): string {
  if (count === 1) {
    return `1 ${singular}`
  }

  return `${count.toLocaleString('pt-BR')} ${plural}`
}
