import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const ROWS = ['publishable', 'secret']

/** Shaped like the keys table, heading included, so nothing jumps when it arrives. */
export function KeysSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando chaves">
      <div className="grid gap-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="h-9 border-b border-border/60" />
        {ROWS.map((row) => (
          <div
            key={row}
            className="flex h-11 items-center gap-6 border-b border-border/60 px-4 last:border-0"
          >
            <Skeleton className="h-3 w-1/5" />
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
