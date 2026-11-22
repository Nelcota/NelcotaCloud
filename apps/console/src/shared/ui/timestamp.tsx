import type { JSX } from 'react'
import { formatDate, formatDateTime } from '@/shared/lib/format-date'
import { formatRelative } from '@/shared/lib/format-relative'

export function Timestamp({
  value,
  format,
}: {
  value: string
  format?: 'date' | 'date_time' | 'relative'
}): JSX.Element {
  const formats = { relative: formatRelative, date: formatDate, date_time: formatDateTime }
  const formatValue = formats[format ?? 'date_time']

  return (
    <time className="tabular-nums" dateTime={value} title={formatDateTime(value)}>
      {formatValue(value)}
    </time>
  )
}
