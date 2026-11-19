import type { JSX } from 'react'

import { formatDateTime, formatRelative } from '@/shared/lib/format-date'

/** How long ago something happened ("há 2 dias"), with the exact date and time on hover. */
export function RelativeTime({ value }: { value: string }): JSX.Element {
  return (
    <time dateTime={value} title={formatDateTime(value)}>
      {formatRelative(value)}
    </time>
  )
}
