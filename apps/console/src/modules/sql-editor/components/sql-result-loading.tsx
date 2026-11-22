import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

/** Rows the size of the grid's, so the panel keeps its shape while a query runs. */
const LOADING_ROWS = 5

/** The result while the query runs: placeholder rows shaped like the grid. */
export function SqlResultLoading(): JSX.Element {
  const rows = Array.from({ length: LOADING_ROWS }, (_, index) => index)

  return (
    <div role="status" aria-label="Executando a consulta" className="flex flex-col gap-3 p-4">
      <Skeleton className="h-3 w-1/3" />
      {rows.map((row) => (
        <Skeleton key={row} className="h-5" />
      ))}
    </div>
  )
}
