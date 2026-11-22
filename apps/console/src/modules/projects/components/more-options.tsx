import { ChevronDown } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { Button } from '@/shared/ui/primitives/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type MoreOptionsProps = {
  /** The small link that opens the rest ("Mais opções"). */
  label: string
  children: ReactNode
}

/** Keeps what most people never change out of sight, one small link away. */
export function MoreOptions({ label, children }: MoreOptionsProps): JSX.Element {
  return (
    <Collapsible className="grid gap-4">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="group w-fit px-0 text-muted-foreground hover:text-foreground"
        >
          {label}
          <ChevronDown
            aria-hidden
            data-icon="inline-end"
            className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid gap-6">{children}</CollapsibleContent>
    </Collapsible>
  )
}
