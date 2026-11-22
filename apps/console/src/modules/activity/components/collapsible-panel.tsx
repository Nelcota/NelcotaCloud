import { ChevronRight } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type CollapsiblePanelProps = {
  title: string
  /** A quiet figure after the title; nothing while it loads. */
  count: number | undefined
  children: ReactNode
}

/** A framed panel folded to its title, for the tables a visit rarely needs. */
export function CollapsiblePanel({ title, count, children }: CollapsiblePanelProps): JSX.Element {
  return (
    <Collapsible className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <h2>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-start transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <ChevronRight
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
          />
          <span className="text-base font-semibold">{title}</span>
          {count !== undefined && (
            <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
          )}
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="border-t">{children}</CollapsibleContent>
    </Collapsible>
  )
}
