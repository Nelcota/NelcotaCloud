import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityFeedBody } from '@/modules/activity/components/activity-feed-body'
import { AuditEventSheet } from '@/modules/activity/components/audit-event-sheet'
import { BlockAddressDialog } from '@/modules/activity/components/block-address-dialog'
import { DetectedFields } from '@/modules/activity/components/detected-fields'
import { LogPanelHeader } from '@/modules/activity/components/log-panel-header'
import { LogQueryForm } from '@/modules/activity/components/log-query-form'
import {
  type ActivityFiltersControl,
  auditFilterOf,
} from '@/modules/activity/components/use-activity-filters'
import { useAuditRowContext } from '@/modules/activity/components/use-audit-row-context'
import { useLiveRefetch } from '@/modules/activity/components/use-live-refetch'
import { useLogFacets } from '@/modules/activity/components/use-log-facets'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import type { components } from '@/shared/api/api-schema'

type ActivityLogProps = {
  projectId: string
  /** One user's events, without the user field or address blocking. */
  userId?: string
  control: ActivityFiltersControl
}

/** The log viewer: search and detected fields, the lines, and the panel of the event picked. */
export function ActivityLog({ projectId, userId, control }: ActivityLogProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, filter: auditFilterOf(control.filters, userId) })
  const context = useAuditRowContext(projectId)
  const [openEvent, setOpenEvent] = useState<components['schemas']['AuditEvent'] | null>(null)
  const [blockTarget, setBlockTarget] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)
  const showsUser = userId === undefined
  const events = pages.data?.pages.flatMap((page) => page.events)
  const facets = useLogFacets({ events, control, showsUser })
  useLiveRefetch(pages.refetch, isLive)

  /** Applies the box at once; with the same search, reads the log again. */
  function run(): void {
    const text = control.filters.searchText.trim()

    if (text !== control.filters.search) {
      control.showAddress(text)
      return
    }

    void pages.refetch()
  }

  function filterAddress(address: string): void {
    setOpenEvent(null)
    control.showAddress(address)
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside aria-label="Filtros do log" className="flex min-w-0 flex-col gap-5">
        <LogQueryForm control={control} onRun={run} />
        <DetectedFields facets={facets} />
      </aside>
      <div className="flex min-w-0 flex-col gap-2">
        <LogPanelHeader control={control} isLive={isLive} onLiveChange={setIsLive} />
        <div className="min-w-0 overflow-hidden rounded-xl bg-card">
          <ActivityFeedBody
            pages={pages}
            facets={facets}
            view={{
              context,
              showsUser,
              filters: control.filters,
              isLive,
              onClear: () => {
                control.clear()
                facets.clearFields()
              },
              onOpen: setOpenEvent,
            }}
          />
        </div>
      </div>
      <AuditEventSheet
        event={openEvent}
        context={context}
        actions={{
          onFilter: filterAddress,
          onBlock: blockerFor(userId, setBlockTarget),
          onClose: () => setOpenEvent(null),
        }}
      />
      <BlockAddressDialog
        projectId={projectId}
        address={blockTarget}
        onClose={() => setBlockTarget(null)}
      />
    </div>
  )
}

/** Blocking belongs to the project's activity page, not to one user's. */
function blockerFor(
  userId: string | undefined,
  onBlock: (address: string) => void,
): ((address: string) => void) | undefined {
  if (userId !== undefined) {
    return undefined
  }

  return onBlock
}
