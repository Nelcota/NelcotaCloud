import { ChevronRight, Search } from 'lucide-react'
import type { JSX } from 'react'

const CRUMBS = ['Projetos', 'Loja Aurora']

/** The miniature's top bar: account chip, breadcrumb and the search pill. */
export function MiniatureTopBar(): JSX.Element {
  return (
    <div className="flex h-8 items-center gap-2 px-2.5 text-2xs text-muted-foreground">
      <span className="flex items-center gap-1.5 text-foreground">
        <span className="grid size-4 place-items-center rounded-[4px] bg-surface-hover font-medium">
          A
        </span>
        aurora
      </span>
      <span className="ms-1 flex min-w-0 items-center gap-1">
        {CRUMBS.map((crumb) => (
          <span key={crumb} className="flex items-center gap-1">
            {crumb}
            <ChevronRight className="size-2.5" />
          </span>
        ))}
        <span className="text-foreground">Visão geral</span>
      </span>
      <span className="ms-auto flex w-28 items-center gap-1 rounded-md bg-surface px-1.5 py-1">
        <Search className="size-2.5" />
        Buscar…
        <span className="ms-auto rounded-[3px] bg-surface-hover px-1 font-mono">⌘K</span>
      </span>
    </div>
  )
}
