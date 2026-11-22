import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

type LiveIndicatorProps = {
  /** Paused shows a still grey dot, so the label never claims updates that are not happening. */
  isLive: boolean
  label?: string
  className?: string
}

/** "Ao vivo": a green dot that pulses softly while the view refreshes on its own. */
export function LiveIndicator({
  isLive,
  label = 'Ao vivo',
  className,
}: LiveIndicatorProps): JSX.Element {
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 font-mono text-2xs', className)}
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          'size-1.5 rounded-full',
          isLive && 'animate-live bg-success',
          isLive === false && 'bg-faint',
        )}
      />
      <span className={cn(isLive && 'text-success', isLive === false && 'text-muted-foreground')}>
        {pausedLabel(isLive, label)}
      </span>
    </span>
  )
}

function pausedLabel(isLive: boolean, label: string): string {
  if (isLive) {
    return label
  }

  return 'Pausado'
}
