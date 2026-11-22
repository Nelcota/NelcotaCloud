import type { JSX } from 'react'
import { useState } from 'react'

import { DEFAULT_DAYS } from '@/modules/activity/components/activity-filters'
import { ActivityHeader } from '@/modules/activity/components/activity-header'
import { ActivityLog } from '@/modules/activity/components/activity-log'
import { ActivityStats } from '@/modules/activity/components/activity-stats'
import { ActivitySummary } from '@/modules/activity/components/activity-summary'
import { AddressPanels } from '@/modules/activity/components/address-panels'
import { useActivityFilters } from '@/modules/activity/components/use-activity-filters'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives/tabs'

/** The audit trail: the period's figures, then its events and the addresses to act on. */
export function ActivityPage(): JSX.Element {
  const projectId = useProjectId()
  const control = useActivityFilters(DEFAULT_DAYS)
  const [tab, setTab] = useState('events')
  const days = control.filters.days ?? DEFAULT_DAYS

  function showFailures(address: string): void {
    control.showAddress(address, 'failures')
    setTab('events')
  }

  return (
    <div className="flex flex-col gap-5">
      <ActivityHeader projectId={projectId} control={control} />
      <ActivitySummary projectId={projectId} days={days} onShowEvents={showFailures} />
      <ActivityStats projectId={projectId} days={days} />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <TabsList variant="line">
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="addresses">Endereços</TabsTrigger>
        </TabsList>
        <TabsContent value="events">
          <ActivityLog projectId={projectId} control={control} />
        </TabsContent>
        <TabsContent value="addresses">
          <AddressPanels projectId={projectId} days={days} onShowEvents={showFailures} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
