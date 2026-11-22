import type { JSX } from 'react'

import { DEFAULT_DAYS } from '@/modules/activity/components/activity-filters'
import { ActivityHeader } from '@/modules/activity/components/activity-header'
import { ActivityLog } from '@/modules/activity/components/activity-log'
import { ActivityStats } from '@/modules/activity/components/activity-stats'
import { AddressPanels } from '@/modules/activity/components/address-panels'
import { useActivityFilters } from '@/modules/activity/components/use-activity-filters'
import { useProjectId } from '@/shared/routing/use-project-id'

/** The log explorer: the period's figures, the filtered log, then the addresses to act on. */
export function ActivityPage(): JSX.Element {
  const projectId = useProjectId()
  const control = useActivityFilters(DEFAULT_DAYS)
  const days = control.filters.days ?? DEFAULT_DAYS

  function showFailures(address: string): void {
    control.showAddress(address, 'failures')
  }

  return (
    <div className="flex flex-col gap-6">
      <ActivityHeader projectId={projectId} control={control} />
      <ActivityStats projectId={projectId} days={days} onShowEvents={showFailures} />
      <ActivityLog projectId={projectId} control={control} />
      <AddressPanels projectId={projectId} days={days} onShowEvents={showFailures} />
    </div>
  )
}
