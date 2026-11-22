import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityFeedBody } from '@/modules/activity/components/activity-feed-body'
import { ActivityToolbar } from '@/modules/activity/components/activity-toolbar'
import { AuditEventSheet } from '@/modules/activity/components/audit-event-sheet'
import { BlockAddressDialog } from '@/modules/activity/components/block-address-dialog'
import {
  type ActivityFiltersControl,
  auditFilterOf,
} from '@/modules/activity/components/use-activity-filters'
import { useAuditRowContext } from '@/modules/activity/components/use-audit-row-context'
import { useLiveRefetch } from '@/modules/activity/components/use-live-refetch'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import type { components } from '@/shared/api/api-schema'

type ActivityLogProps = {
  projectId: string
  /** One user's events, without the user's email or address blocking. */
  userId?: string
  control: ActivityFiltersControl
}

/** The audit trail: the filters, the events by day, and the panel of the event picked. */
export function ActivityLog({ projectId, userId, control }: ActivityLogProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, filter: auditFilterOf(control.filters, userId) })
  const context = useAuditRowContext(projectId)
  const [openEvent, setOpenEvent] = useState<components['schemas']['AuditEvent'] | null>(null)
  const [blockTarget, setBlockTarget] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(true)
  // Refreshing an infinite list reloads every page: live mode follows only the first one.
  useLiveRefetch(pages.refetch, isLive && (pages.data?.pages.length ?? 1) <= 1)

  /** With a new search, applies it at once; with the same one, reads the feed again. */
  function searchNow(): void {
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
    <div className="flex min-w-0 flex-col gap-3">
      <ActivityToolbar
        control={control}
        live={{ isLive, onLiveChange: setIsLive }}
        onSearchNow={searchNow}
      />
      <div className="min-w-0 rounded-xl bg-card">
        <ActivityFeedBody
          pages={pages}
          view={{
            context,
            showsUser: userId === undefined,
            filters: control.filters,
            isLive,
            onClear: control.clear,
            onOpen: setOpenEvent,
          }}
        />
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
