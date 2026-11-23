import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'

import type { IconComponent } from '@/shared/ui/icon-component'
import { Badge } from '@/shared/ui/primitives/badge'

/** What a confirmed action changes: one thing, from its current state to the new one. */
export type ConfirmChange = {
  /** The thing that changes, named the way the page shows it (`secret …6b16`). */
  subject: string
  icon: IconComponent
  from: string
  to: string
}

/** The change a confirmation makes, so the result is seen before it happens. */
export function ConfirmChangePreview({ change }: { change: ConfirmChange }): JSX.Element {
  const Glyph = change.icon

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-sm">
      <Glyph aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 font-medium wrap-anywhere">{change.subject}</span>
      <span className="sr-only">
        {change.from} passa a {change.to}
      </span>
      <span aria-hidden className="flex items-center gap-2">
        <Badge variant="muted">{change.from}</Badge>
        <ArrowRight className="size-4 text-muted-foreground" />
        <Badge variant="outline">{change.to}</Badge>
      </span>
    </div>
  )
}
