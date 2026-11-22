import type { JSX } from 'react'

import { ActivityChartCard } from '@/modules/overview/components/activity-chart-card'
import { BuildWithAiPanel } from '@/modules/overview/components/build-with-ai-panel'
import { ConnectAppPanel } from '@/modules/overview/components/connect-app-panel'
import { HealthNoticeStrip } from '@/modules/overview/components/health-notice'
import { NextStepCard } from '@/modules/overview/components/next-step-card'
import { RecentActivity } from '@/modules/overview/components/recent-activity'
import { ServicesPanel } from '@/modules/overview/components/services-panel'
import { StatRow } from '@/modules/overview/components/stat-row'

const TWO_THIRDS = 'grid items-stretch gap-6 @min-[56rem]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'
const HALVES = 'grid items-stretch gap-6 @min-[56rem]:grid-cols-2'

type OverviewDashboardProps = { projectId: string; days: number }

/** Health, the four metrics, the chart beside the next step, then connecting and the services. */
export function OverviewDashboard({ projectId, days }: OverviewDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <HealthNoticeStrip projectId={projectId} days={days} />
      <StatRow projectId={projectId} days={days} />
      <div className={TWO_THIRDS}>
        <ActivityChartCard projectId={projectId} days={days} />
        <NextStepCard projectId={projectId} days={days} />
      </div>
      <div className={HALVES}>
        <ConnectAppPanel projectId={projectId} />
        <BuildWithAiPanel projectId={projectId} />
      </div>
      <div className={TWO_THIRDS}>
        <RecentActivity projectId={projectId} />
        <ServicesPanel projectId={projectId} />
      </div>
    </div>
  )
}
