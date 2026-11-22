import { ChevronDown } from 'lucide-react'
import { useState, type JSX, type ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/primitives/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'

type RevealableSampleProps = { label: string; children: ReactNode }

/** Secondary reference (samples, the event catalog) kept behind one click. */
export function RevealableSample({ label, children }: RevealableSampleProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="grid gap-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="justify-self-start">
          {label}
          <ChevronDown
            aria-hidden
            data-icon="inline-end"
            className={cn('transition-transform', isOpen && 'rotate-180')}
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid min-w-0 gap-3">{children}</CollapsibleContent>
    </Collapsible>
  )
}
