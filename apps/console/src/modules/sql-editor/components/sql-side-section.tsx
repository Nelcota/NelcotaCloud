import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX, ReactNode } from 'react'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type SqlSideSectionProps = {
  title: string
  /** A quiet figure after the title, such as the number of tables. */
  meta?: ReactNode
  isOpenByDefault: boolean
  children: ReactNode
}

/** A quiet, collapsible group beside the editor, so the editor stays the loudest thing. */
export function SqlSideSection(props: SqlSideSectionProps): JSX.Element {
  return (
    <Collapsible defaultOpen={props.isOpenByDefault} className="group/side flex min-w-0 flex-col">
      <h2>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <AltArrowDown
            aria-hidden
            className="size-4 transition-transform group-data-[state=closed]/side:-rotate-90"
          />
          {props.title}
          <span className="ms-auto text-xs tabular-nums">{props.meta}</span>
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="pt-1">{props.children}</CollapsibleContent>
    </Collapsible>
  )
}
