import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/skeleton'

const SKELETON_ROWS = ['a', 'b', 'c', 'd', 'e', 'f']

/** The table's shape while it loads: header, rows with avatar, status and date, then the footer. */
export function UsersSkeleton(): JSX.Element {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando usuários"
      className="surface @container divide-border/60 grid divide-y overflow-hidden"
    >
      <div className="h-11 bg-black/[0.03] dark:bg-black/10" />
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex h-13 items-center gap-3 px-4">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 max-w-56 flex-1" />
          <Skeleton className="ml-auto hidden h-4 w-24 @2xl:block" />
          <Skeleton className="hidden h-4 w-20 @2xl:block" />
        </div>
      ))}
      <div className="h-12" />
    </div>
  )
}
