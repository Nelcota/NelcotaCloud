import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

type StatCardProps = {
  label: string
  value: ReactNode
  /** One quiet line under the value ("vs. mês anterior", "3 de 20"). */
  hint?: ReactNode
  /** Drawn at the end of the value row: a sparkline, a status dot or a link. */
  aside?: ReactNode
  /** Extra content under the hint, such as a usage bar. */
  children?: ReactNode
  className?: string
}

/** One metric: its name, its figure in large type and the context to read it. */
export function StatCard({
  label,
  value,
  hint,
  aside,
  children,
  className,
}: StatCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1.5 rounded-xl border border-border/60 bg-card p-4',
        className,
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-end justify-between gap-3">
        <span className="truncate text-2xl font-semibold text-heading tabular-nums">{value}</span>
        {aside}
      </div>
      <StatHint hint={hint} />
      {children}
    </div>
  )
}

function StatHint({ hint }: { hint?: ReactNode }): JSX.Element | null {
  if (hint === undefined || hint === null) {
    return null
  }

  return <span className="truncate text-xs text-muted-foreground">{hint}</span>
}
