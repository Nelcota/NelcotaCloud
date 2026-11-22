import type { JSX } from 'react'

import { MiniatureChart } from '@/modules/account/components/miniature-chart'
import { MiniatureStat } from '@/modules/account/components/miniature-stat'

const STATS = [
  { label: 'Usuários ativos', value: '1.284', trend: [4, 6, 5, 7, 8, 7, 10, 12] },
  { label: 'Logins hoje', value: '312', trend: [8, 6, 9, 7, 10, 9, 11, 10] },
  { label: 'Requisições', value: '48,2 mil', trend: [3, 4, 4, 6, 5, 8, 9, 11] },
]

const RAIL_ITEMS = [0, 1, 2, 3]

/** A static picture of a project's overview, drawn with markup; decorative, so hidden from readers. */
export function ConsoleMiniature(): JSX.Element {
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none flex overflow-hidden rounded-xl border bg-frame p-1.5 select-none"
    >
      <div className="flex w-8 shrink-0 flex-col items-center gap-2.5 pt-2">
        <span className="size-4 rounded-sm bg-primary" />
        {RAIL_ITEMS.map((item) => (
          <span key={item} className="size-3.5 rounded-sm bg-muted" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col rounded-lg border bg-background">
        <div className="flex items-center gap-1.5 border-b px-3 py-2 text-xs text-muted-foreground">
          <span>Projetos</span>
          <span>/</span>
          <span>Loja Aurora</span>
          <span>/</span>
          <span className="text-foreground">Visão geral</span>
        </div>
        <div className="flex flex-col gap-2.5 p-3">
          <span className="text-xs font-semibold text-heading">Visão geral</span>
          <div className="grid grid-cols-3 gap-2">
            {STATS.map((stat) => (
              <MiniatureStat key={stat.label} {...stat} />
            ))}
          </div>
          <MiniatureChart />
        </div>
      </div>
    </div>
  )
}
