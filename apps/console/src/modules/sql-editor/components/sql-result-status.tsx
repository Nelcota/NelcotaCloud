import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'

type SqlResult = components['schemas']['SqlResult']

type SqlResultStatusProps = {
  result: SqlResult | undefined
  error: Error | null
  isRunning: boolean
  durationMs: number | null
}

const DURATION = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

/** "12 linhas · 34 ms": rows, time and truncation of the last run, announced when they change. */
export function SqlResultStatus(props: SqlResultStatusProps): JSX.Element {
  return (
    <span role="status" className="min-w-0 text-xs text-muted-foreground tabular-nums">
      {statusText(props)}
      <TruncatedNote
        result={props.result}
        isShown={props.error === null && props.isRunning === false}
      />
    </span>
  )
}

function statusText({ result, error, isRunning, durationMs }: SqlResultStatusProps): string {
  if (isRunning) {
    return 'Executando…'
  }

  // A refusal is told by the panel below, in Postgres's own words.
  if (error !== null || result === undefined) {
    return ''
  }

  return [rowsText(result), durationText(durationMs)].filter((part) => part !== '').join(' · ')
}

function durationText(durationMs: number | null): string {
  if (durationMs === null) {
    return ''
  }

  return `${DURATION.format(durationMs)} ms`
}

type TruncatedNoteProps = { result: SqlResult | undefined; isShown: boolean }

function TruncatedNote({ result, isShown }: TruncatedNoteProps): JSX.Element | null {
  if (result === undefined || isShown === false || result.is_truncated === false) {
    return null
  }

  return (
    <span className="text-warning">
      {' '}
      · mostrando as primeiras {formatCount(result.rows.length)}
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
