import type { JSX } from 'react'

import { ActivityChartCard } from '@/modules/overview/components/activity-chart-card'
import { ConnectAppPanel } from '@/modules/overview/components/connect-app-panel'
import { HealthNoticeStrip } from '@/modules/overview/components/health-notice'
import { NextStepCard } from '@/modules/overview/components/next-step-card'
import { RecentActivity } from '@/modules/overview/components/recent-activity'
import { ServicesPanel } from '@/modules/overview/components/services-panel'
import { StatRow } from '@/modules/overview/components/stat-row'

const TWO_THIRDS =
  'grid grid-cols-1 items-stretch gap-4 @min-[56rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'

type OverviewDashboardProps = { projectId: string; days: number }

/** The verdict sentence, the four metrics, the chart beside the next step, the feed and services. */
export function OverviewDashboard({ projectId, days }: OverviewDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <HealthNoticeStrip projectId={projectId} days={days} />
      <StatRow projectId={projectId} days={days} />
      <div className={TWO_THIRDS}>
        <ActivityChartCard projectId={projectId} days={days} />
        <NextStepCard projectId={projectId} days={days} />
      </div>
      <div className={TWO_THIRDS}>
        <RecentActivity projectId={projectId} />
        <ServicesPanel projectId={projectId} />
      </div>
      <ConnectAppPanel projectId={projectId} />
    </div>
  )
}
