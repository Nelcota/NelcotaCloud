import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/skeleton'

/** The page's shape while the user loads: the header, the tabs and the overview's two cards. */
export function UserDetailSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando usuário" className="grid gap-8">
      <div className="grid gap-4">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
        </div>
      </div>
      <div className="flex gap-6 border-b pb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}
