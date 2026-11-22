import type { JSX } from 'react'

import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'

type LogLinesLoadingProps = { error: Error | null; onRetry: () => void }

const SKELETON_LINES = [0, 1, 2, 3, 4, 5]

/** The first page on its way: line-shaped placeholders, or why it failed and a retry. */
export function LogLinesLoading({ error, onRetry }: LogLinesLoadingProps): JSX.Element {
  if (error !== null) {
    return (
      <div className="p-3">
        <LoadError error={error} onRetry={onRetry} />
      </div>
    )
  }

  return (
    <div role="status" aria-busy="true" className="flex flex-col">
      <span className="sr-only">Carregando atividade</span>
      {SKELETON_LINES.map((line) => (
        <div key={line} className="grid gap-1.5 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3.5 w-2/5" />
        </div>
      ))}
    </div>
  )
}
