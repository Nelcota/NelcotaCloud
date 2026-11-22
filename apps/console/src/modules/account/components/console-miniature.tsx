import type { JSX } from 'react'

import { MiniatureChart } from '@/modules/account/components/miniature-chart'
import { MiniatureRail } from '@/modules/account/components/miniature-rail'
import { MiniatureSidebar } from '@/modules/account/components/miniature-sidebar'
import { MiniatureStat } from '@/modules/account/components/miniature-stat'
import { MiniatureTopBar } from '@/modules/account/components/miniature-top-bar'

const STATS = [
  {
    label: 'Usuários ativos',
    value: '1.284',
    context: '+12% em 7 dias',
    trend: [4, 6, 5, 7, 8, 7, 10, 12],
  },
  { label: 'Logins hoje', value: '312', context: 'há 2min', trend: [8, 6, 9, 7, 10, 9, 11, 10] },
  {
    label: 'Requisições',
    value: '48,2 mil',
    context: '99 ms em média',
    trend: [3, 4, 4, 6, 5, 8, 9, 11],
  },
]

/** A static picture of a project's overview, drawn with markup; decorative, so hidden from readers. */
export function ConsoleMiniature(): JSX.Element {
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none flex overflow-hidden rounded-xl bg-frame p-1.5 ring-1 ring-border select-none"
    >
      <MiniatureRail />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-background">
        <MiniatureTopBar />
        <div className="flex min-w-0">
          <MiniatureSidebar />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3">
            <div className="grid gap-0.5">
              <span className="text-xs font-medium text-heading">Visão geral</span>
              <span className="text-2xs text-muted-foreground">
                <span className="font-medium text-success">Saudável.</span> Nenhum login recusado em
                30 dias.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {STATS.map((stat) => (
                <MiniatureStat key={stat.label} {...stat} />
              ))}
            </div>
            <MiniatureChart />
          </div>
        </div>
      </div>
    </div>
  )
}
