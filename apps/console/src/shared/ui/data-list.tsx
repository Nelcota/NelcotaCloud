import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

/** Facts about one record, as label and value rows. */
export function DataList({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return <dl className={cn('grid divide-y divide-border', className)}>{children}</dl>
}

export function DataListItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="grid min-w-0 gap-1 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-xs wrap-anywhere">{children}</dd>
    </div>
  )
}
