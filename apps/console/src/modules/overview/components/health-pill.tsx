import type { JSX } from 'react'

import type { ProjectHealth } from '@/modules/overview/components/project-health'
import { cn } from '@/shared/lib/utils'
import type { StatusTone } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const TONES: Record<StatusTone, string> = {
  neutral: 'border-border text-muted-foreground',
  success: 'border-success/30 text-success',
  warning: 'border-warning/30 text-warning',
  error: 'border-destructive/30 text-destructive',
  info: 'border-info/30 text-info',
  brand: 'border-primary/30 text-primary',
}

/** The project's state next to its name. */
export function HealthPill({ health }: { health: ProjectHealth }): JSX.Element {
  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-sm font-medium',
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
