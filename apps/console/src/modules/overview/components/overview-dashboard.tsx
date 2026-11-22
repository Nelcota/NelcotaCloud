import type { JSX } from 'react'

import { ActivityChartCard } from '@/modules/overview/components/activity-chart-card'
import { HealthNoticeStrip } from '@/modules/overview/components/health-notice'
import { NextStepsCard } from '@/modules/overview/components/next-steps-card'
import { RecentActivity } from '@/modules/overview/components/recent-activity'
import { ServiceCards } from '@/modules/overview/components/service-cards'
import { StatRow } from '@/modules/overview/components/stat-row'

const CHART_AND_FEED =
  'grid grid-cols-1 items-stretch gap-4 @min-[56rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'

type OverviewDashboardProps = { projectId: string; days: number }

/**
 * The verdict, the setup left to do (while there is some), the four metrics, the chart beside
 * the latest events, and the services. Each fact and each action appears once.
 */
export function OverviewDashboard({ projectId, days }: OverviewDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-5">
      <HealthNoticeStrip projectId={projectId} days={days} />
      <NextStepsCard projectId={projectId} days={days} />
      <StatRow projectId={projectId} days={days} />
      <div className={CHART_AND_FEED}>
        <ActivityChartCard projectId={projectId} days={days} />
        <RecentActivity projectId={projectId} />
      </div>
      <ServiceCards projectId={projectId} />
    </div>
  )
}
