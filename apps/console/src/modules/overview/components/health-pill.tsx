import type { JSX } from 'react'

import type { ProjectHealth } from '@/modules/overview/components/project-health'
import { cn } from '@/shared/lib/utils'
import type { StatusTone } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const TONES: Record<StatusTone, string> = {
  neutral: 'bg-surface text-muted-foreground',
  success: 'bg-success/14 text-success',
  warning: 'bg-warning/12 text-warning',
  error: 'bg-destructive/12 text-destructive',
  info: 'bg-info/12 text-info',
  brand: 'bg-brand-subtle text-primary',
}

/** The project's state next to its name. */
export function HealthPill({ health }: { health: ProjectHealth }): JSX.Element {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-[6px] px-2 text-2xs font-medium',
        TONES[health.tone],
      )}
    >
      <span aria-hidden className="flex">
        <StatusDot tone={health.tone} label={health.label} />
      </span>
      {health.label}
    </span>
  )
}
