import type { JSX } from 'react'
import { formatDate, formatDateTime } from '@/shared/lib/format-date'

const relative = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
const units = [
  ['year', 365 * 86_400],
  ['month', 30 * 86_400],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
  ['second', 1],
] as const

function relativeDate(value: string): string {
  const delta = (Date.parse(value) - Date.now()) / 1000

  if (!Number.isFinite(delta)) {
    return '—'
  }

  const [unit, divisor] = units.find(([, amount]) => Math.abs(delta) >= amount) ?? ['second', 1]

  return relative.format(Math.round(delta / divisor), unit)
}

export function Timestamp({
  value,
  format,
}: {
  value: string
  format?: 'date' | 'date_time' | 'relative'
}): JSX.Element {
  const formats = { relative: relativeDate, date: formatDate, date_time: formatDateTime }
  const formatValue = formats[format ?? 'date_time']

  return (
    <time className="tabular-nums" dateTime={value} title={formatDateTime(value)}>
      {formatValue(value)}
    </time>
  )
}
