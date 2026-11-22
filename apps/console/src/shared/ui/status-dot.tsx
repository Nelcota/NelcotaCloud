import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import type { StatusTone } from '@/shared/ui/status-badge'

const COLORS: Record<StatusTone, string> = {
  neutral: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
  info: 'bg-info',
  brand: 'bg-primary',
}

/** A colored dot whose meaning is read by screen readers through its label. */
export function StatusDot({ tone, label }: { tone: StatusTone; label: string }): JSX.Element {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn('inline-block size-2 shrink-0 rounded-full', COLORS[tone])}
    />
  )
}
