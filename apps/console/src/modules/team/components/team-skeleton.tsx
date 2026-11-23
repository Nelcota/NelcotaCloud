import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = [0, 1]

/** Shaped like the page it stands for, members and the roles panel, so nothing jumps on load. */
export function TeamSkeleton(): JSX.Element {
  return (
    <div
      className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]"
      role="status"
      aria-busy="true"
    >
      <span className="sr-only">Carregando equipe</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="h-11 border-b border-border/60" />
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
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
