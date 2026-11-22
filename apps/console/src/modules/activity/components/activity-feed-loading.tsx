import type { JSX } from 'react'

import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type ActivityFeedLoadingProps = { error: Error | null; onRetry: () => void }

const SKELETON_ROWS = [0, 1, 2, 3, 4, 5]

/** The first page on its way: row-shaped placeholders, or why it failed and a retry. */
export function ActivityFeedLoading({ error, onRetry }: ActivityFeedLoadingProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="p-3">
        <LoadError error={error} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <div role="status" aria-busy="true" className="flex flex-col pt-2">
      <span className="sr-only">Carregando atividade</span>
      <Skeleton className="mx-3 my-1.5 h-3 w-24" />
      {SKELETON_ROWS.map((row) => (
        <div key={row} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
