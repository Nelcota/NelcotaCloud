import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = [0, 1]

/** Shaped like the members list it stands for, heading included, so nothing jumps on load. */
export function TeamSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando equipe">
      <Skeleton className="h-5 w-24" />
      <div className="overflow-hidden rounded-xl border bg-card">
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className="flex items-center justify-between gap-3 border-t px-4 py-3 first:border-t-0"
          >
            <div className="flex w-3/5 items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
