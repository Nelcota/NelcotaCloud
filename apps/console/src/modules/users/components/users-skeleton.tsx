import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const SKELETON_ROWS = [0, 1, 2, 3, 4]

/** Placeholder rows shaped like the users table while the first page loads. */
export function UsersSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando usuários" className="divide-y">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-3 px-4 py-3">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-3.5 w-1/4" />
          <Skeleton className="ms-auto h-5 w-24 rounded-md" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}
