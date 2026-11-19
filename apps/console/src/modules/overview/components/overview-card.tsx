import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import { MetricCardBody, type MetricCardBodyProps } from '@/shared/ui/metric-card'
import { METRIC_CARD_ACTION_CLASS, METRIC_CARD_CLASS } from '@/shared/ui/metric-card-styles'

type OverviewCardProps = Omit<MetricCardBodyProps, 'detail' | 'hasArrow'> & {
  /** `null` while loading; a placeholder line stands in for it. */
  detail: string | null
  /** The page where this figure is managed; the whole card links there. */
  to?: string
}

/** Room for the two-line details some overview cards carry, so a row of them reads level. */
const OVERVIEW_CARD_HEIGHT = 'min-h-36'

/** One figure of the project, linking to where it is managed when it loaded. */
export function OverviewCard({ to, ...props }: OverviewCardProps): JSX.Element {
  if (to === undefined || props.error !== null) {
    return (
      <section className={cn(METRIC_CARD_CLASS, OVERVIEW_CARD_HEIGHT)}>
        <MetricCardBody {...props} />
      </section>
    )
  }

  return (
    <Link to={to} className={cn(METRIC_CARD_CLASS, OVERVIEW_CARD_HEIGHT, METRIC_CARD_ACTION_CLASS)}>
      <MetricCardBody {...props} hasArrow />
    </Link>
  )
}
