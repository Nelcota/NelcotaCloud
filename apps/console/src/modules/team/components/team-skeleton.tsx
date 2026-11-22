import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = [0, 1]

/** Shaped like the members table it stands for, heading included, so nothing jumps on load. */
export function TeamSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando equipe">
      <Skeleton className="h-4 w-24" />
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="h-9 border-b border-border/60" />
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className="flex h-12 items-center justify-between gap-3 border-b border-border/60 px-4 last:border-0"
          >
            <div className="flex w-3/5 items-center gap-2.5">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <Skeleton className="h-3 flex-1" />
            </div>
            <Skeleton className="h-5 w-14 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
