import { ChevronRight } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type CollapsiblePanelProps = {
  title: string
  /** What the table answers, on the folded line. */
  description: string
  /** A quiet figure after the title; nothing while it loads. */
  count: number | undefined
  children: ReactNode
}

/** A framed panel folded to its title, for the tables a visit rarely needs. */
export function CollapsiblePanel({
  title,
  description,
  count,
  children,
}: CollapsiblePanelProps): JSX.Element {
  return (
    <Collapsible className="min-w-0 overflow-hidden rounded-xl bg-card">
      <h2>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 px-4 py-3 text-start transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
          <ChevronRight
            aria-hidden
            className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90 motion-reduce:transition-none"
          />
          <span className="text-base font-medium">{title}</span>
          {count !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
          )}
          <span className="ms-auto hidden text-xs text-muted-foreground sm:inline">
            {description}
          </span>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="border-t border-border/60">{children}</CollapsibleContent>
    </Collapsible>
  )
}
