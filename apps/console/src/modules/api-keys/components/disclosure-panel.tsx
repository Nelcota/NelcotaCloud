import { ChevronDown } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type DisclosurePanelProps = {
  title: string
  /** One quiet line next to the title, read while the panel is closed. */
  summary: string
  /** Rows that reach the panel's edges, like a list, instead of padded content. */
  isFlush?: boolean
  children: ReactNode
}

/** A rarely needed part of the page, closed until asked for. */
export function DisclosurePanel(props: DisclosurePanelProps): JSX.Element {
  const { title, summary, children } = props

  return (
    <Collapsible className="group/disclosure rounded-xl border bg-card">
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-start transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-base font-medium text-heading">{title}</span>
          <span className="text-sm text-muted-foreground">{summary}</span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/disclosure:rotate-180 motion-reduce:transition-none"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn('border-t', props.isFlush !== true && 'p-4')}>
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}
