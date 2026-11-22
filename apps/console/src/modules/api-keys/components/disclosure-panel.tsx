import { ChevronRight } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type DisclosurePanelProps = {
  title: string
  /** One quiet figure next to the title, read while the panel is closed. */
  summary: string
  /** Rows that reach the edges of the panel, like a list, instead of padded content. */
  isFlush?: boolean
  children: ReactNode
}

/** A rarely needed part of the page, closed until asked for. */
export function DisclosurePanel(props: DisclosurePanelProps): JSX.Element {
  const { title, summary, children } = props

  return (
    <Collapsible className="group/disclosure overflow-hidden rounded-xl border border-border/60 bg-card">
      <CollapsibleTrigger className="flex h-10 w-full items-center gap-2 px-4 text-start transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring">
        <ChevronRight
          aria-hidden
          className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/disclosure:rotate-90 motion-reduce:transition-none"
        />
        <span className="text-xs font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{summary}</span>
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn('border-t border-border/60', props.isFlush !== true && 'p-4')}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
