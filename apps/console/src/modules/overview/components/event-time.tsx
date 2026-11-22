import type { JSX } from 'react'

import { formatDateTime } from '@/shared/lib/format-date'

const UNKNOWN_TIME = '—'
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DAY_AND_TIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** "14:05" today, "21/11 14:05" before; the full date on hover. */
export function EventTime({ value }: { value: string }): JSX.Element {
  return (
    <time
      dateTime={value}
      title={formatDateTime(value)}
      className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums"
    >
      {shortTimeOf(value)}
    </time>
  )
}

function shortTimeOf(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_TIME
  }

  if (date.toDateString() === new Date().toDateString()) {
    return TIME.format(date)
  }

  return DAY_AND_TIME.format(date)
}
