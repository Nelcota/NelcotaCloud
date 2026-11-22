import { ChevronRight } from 'lucide-react'
import type { JSX } from 'react'

import type { Insight, InsightSeverity } from '@/modules/overview/components/insight-types'
import { RouterLink } from '@/shared/routing/router-link'
import type { StatusTone } from '@/shared/ui/status-badge'
import { StatusDot } from '@/shared/ui/status-dot'

const DOTS: Record<InsightSeverity, { tone: StatusTone; label: string }> = {
  warning: { tone: 'warning', label: 'Atenção' },
  info: { tone: 'info', label: 'Sugestão' },
}

/** One point of attention on one line; the whole row opens the page that fixes it. */
export function InsightRow({ insight }: { insight: Insight }): JSX.Element {
  const dot = DOTS[insight.severity]

  return (
    <RouterLink
      href={insight.action.to}
      title={insight.text}
      className="group flex min-w-0 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface"
    >
      <StatusDot tone={dot.tone} label={dot.label} />
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{insight.title}</span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {insight.action.label}
        <ChevronRight aria-hidden className="size-3.5" />
      </span>
    </RouterLink>
  )
}
