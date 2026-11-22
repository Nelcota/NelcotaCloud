import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = [0, 1]

/** Two rows shaped like the sessions table while it loads. */
export function SessionsSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando sessões" className="divide-y divide-border/70">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex h-11 items-center gap-6 px-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}
