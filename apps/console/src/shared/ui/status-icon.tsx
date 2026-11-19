import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'

export type StatusTone = 'neutral' | 'success' | 'danger'

/** What a page's state looks like above its title: the icon, its tone, and whether it spins. */
export type StatusMark = {
  icon: IconComponent
  tone: StatusTone
  /** For a page waiting on the API; motion stops when the system asks for less. */
  isSpinning?: boolean
}

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: 'text-foreground',
  success: 'text-primary-ink',
  danger: 'text-destructive',
}

/** The icon above a page's title that says, before the words do, how things stand. */
export function StatusIcon({ mark }: { mark?: StatusMark }): JSX.Element | null {
  if (mark === undefined) {
    return null
  }

  const Icon = mark.icon

  return (
    <Icon
      aria-hidden="true"
      className={cn(
        'mb-1 size-9',
        TONE_CLASSES[mark.tone],
        mark.isSpinning === true && 'motion-safe:animate-spin',
      )}
    />
  )
}
