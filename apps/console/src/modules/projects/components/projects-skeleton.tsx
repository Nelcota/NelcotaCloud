import type { JSX } from 'react'

import { Skeleton } from '@/shared/ui/primitives/skeleton'

const PLACEHOLDER_CARDS = [0, 1, 2]

export function ProjectsSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando projetos" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-full max-w-64 rounded-md" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16.25rem),1fr))] gap-3">
        {PLACEHOLDER_CARDS.map((card) => (
          <Skeleton key={card} className="h-60 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
