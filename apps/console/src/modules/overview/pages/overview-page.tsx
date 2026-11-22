import type { JSX } from 'react'
import { useState } from 'react'

import { OverviewDashboard } from '@/modules/overview/components/overview-dashboard'
import { OverviewHeader } from '@/modules/overview/components/overview-header'
import { useProjectId } from '@/shared/routing/use-project-id'

const DEFAULT_DAYS = 30

/** The project's dashboard: health, metrics, activity, connection values and services. */
export function OverviewPage(): JSX.Element {
  const projectId = useProjectId()
  const [days, setDays] = useState(DEFAULT_DAYS)

  return (
    <div className="@container flex flex-col gap-5">
      <OverviewHeader projectId={projectId} days={days} onDaysChange={setDays} />
      <OverviewDashboard projectId={projectId} days={days} />
    </div>
  )
}
