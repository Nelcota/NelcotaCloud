import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'

/** A placeholder with the shape of content that is still loading; a span, so it fits inside text. */
export function Skeleton({ className }: { className?: string }): JSX.Element {
  return (
    <span
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('bg-foreground/8 block rounded-lg motion-safe:animate-pulse', className)}
    />
  )
}
