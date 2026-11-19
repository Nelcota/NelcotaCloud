import ArrowRight from '~icons/solar/arrow-right-linear'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import { badgeVariants } from '@/shared/ui/badge-variants'
import type { IconComponent } from '@/shared/ui/icon-component'

/** What a confirmed action changes: one thing, from its current state to the new one. */
export type ConfirmChange = {
  /** The thing that changes, named the way the page shows it (`secret …6b16`). */
  subject: string
  icon: IconComponent
  from: string
  to: string
}

type ConfirmChangePreviewProps = {
  change: ConfirmChange
  isDestructive: boolean
}

/** Plays the change once when the dialog opens, so the result is seen before it happens. */
export function ConfirmChangePreview({
  change,
  isDestructive,
}: ConfirmChangePreviewProps): JSX.Element {
  const Icon = change.icon

  return (
    <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border px-4 py-3">
      <span className="flex min-w-0 items-center gap-3">
        <Icon aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
        <span className="truncate font-medium">{change.subject}</span>
      </span>
      <span className="sr-only">
        {change.from} passa a {change.to}
      </span>
      <span aria-hidden="true" className="flex items-center gap-2">
        <span
          className={cn(
            badgeVariants({ variant: 'muted' }),
            'animate-change-leave line-through motion-reduce:animate-none',
          )}
        >
          {change.from}
        </span>
        <ArrowRight className="text-muted-foreground animate-change-arrow size-4 origin-left motion-reduce:animate-none" />
        <span
          className={cn(
            badgeVariants({ variant: arrivalVariant(isDestructive) }),
            'animate-change-arrive motion-reduce:animate-none',
          )}
        >
          {change.to}
        </span>
      </span>
    </div>
  )
}

/** The new state is red when something is lost, neutral otherwise: blue stays for actions. */
function arrivalVariant(isDestructive: boolean): 'destructive' | 'neutral' {
  if (isDestructive) {
    return 'destructive'
  }

  return 'neutral'
}
