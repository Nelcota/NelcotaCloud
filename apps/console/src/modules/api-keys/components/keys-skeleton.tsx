import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const TABLES = ['publishable', 'secret']

/** Shaped like the two key tables, so nothing jumps when they arrive. */
export function KeysSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando chaves">
      {TABLES.map((table) => (
        <div key={table} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
