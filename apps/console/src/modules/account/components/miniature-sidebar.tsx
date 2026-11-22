import { ChartColumn as Chart, Database, KeyRound as Key, Users } from 'lucide-react'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

const ITEMS = [
  { id: 'overview', label: 'Visão geral', icon: Chart, isActive: true },
  { id: 'users', label: 'Usuários', icon: Users, isActive: false },
  { id: 'keys', label: 'Chaves de API', icon: Key, isActive: false },
  { id: 'database', label: 'Banco', icon: Database, isActive: false },
]

/** The miniature's project sidebar: the switcher with the slug, then one labeled group. */
export function MiniatureSidebar(): JSX.Element {
  return (
    <div className="flex w-28 shrink-0 flex-col gap-2 px-1.5 pt-1 pb-3">
      <div className="grid rounded-md bg-surface px-2 py-1.5">
        <span className="truncate text-2xs font-medium text-heading">Loja Aurora</span>
        <span className="truncate font-mono text-2xs text-muted-foreground">loja_aurora</span>
      </div>
      <span className="px-2 text-2xs tracking-[0.025em] text-muted-foreground uppercase">
        Projeto
      </span>
      <div className="grid gap-0.5">
        {ITEMS.map((item) => {
          const Glyph = item.icon

          return (
            <span
              key={item.id}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-2xs text-muted-foreground',
                item.isActive && 'bg-surface-hover font-medium text-foreground',
              )}
            >
              <Glyph className={cn('size-3 shrink-0', item.isActive && 'text-brand')} />
              <span className="truncate">{item.label}</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}
