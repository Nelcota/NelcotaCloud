import { ChevronRight, Lightbulb, TriangleAlert } from 'lucide-react'
import type { JSX } from 'react'

import type { Insight, InsightSeverity } from '@/modules/overview/components/insight-types'
import { RouterLink } from '@/shared/routing/router-link'
import type { IconComponent } from '@/shared/ui/icon-component'

/** Severity reads by shape as well as color: a warning triangle or a suggestion bulb. */
const MARKS: Record<InsightSeverity, { icon: IconComponent; color: string; label: string }> = {
  warning: { icon: TriangleAlert, color: 'text-warning', label: 'Atenção' },
  info: { icon: Lightbulb, color: 'text-info', label: 'Sugestão' },
}

/** One point of attention on one line; the whole row opens the page that fixes it. */
export function InsightRow({ insight }: { insight: Insight }): JSX.Element {
  const mark = MARKS[insight.severity]
  const Glyph = mark.icon

  return (
    <RouterLink
      href={insight.action.to}
      title={insight.text}
      className="group flex min-w-0 items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-surface"
    >
      <Glyph role="img" aria-label={mark.label} className={`size-4.5 shrink-0 ${mark.color}`} />
      <span className="min-w-0 flex-1 text-sm text-pretty text-foreground">{insight.title}</span>
      <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {insight.action.label}
        <ChevronRight aria-hidden className="size-4" />
      </span>
    </RouterLink>
  )
}
