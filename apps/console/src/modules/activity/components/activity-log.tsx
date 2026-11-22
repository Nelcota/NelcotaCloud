import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityFeedBody } from '@/modules/activity/components/activity-feed-body'
import { AuditEventSheet } from '@/modules/activity/components/audit-event-sheet'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { BlockAddressDialog } from '@/modules/activity/components/block-address-dialog'
import { LogToolbar } from '@/modules/activity/components/log-toolbar'
import {
  type ActivityFiltersControl,
  auditFilterOf,
} from '@/modules/activity/components/use-activity-filters'
import { useAuditEventsQuery } from '@/modules/activity/queries/use-audit-events-query'
import { useTeamQuery } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { useCurrentAccount } from '@/shared/auth/use-current-account'

type Schemas = components['schemas']

type ActivityLogProps = {
  projectId: string
  /** One user's events, without the user column or address blocking. */
  userId?: string
  control: ActivityFiltersControl
}

/** The toolbar, the framed log, and the panel with the details of the event picked. */
export function ActivityLog({ projectId, userId, control }: ActivityLogProps): JSX.Element {
  const pages = useAuditEventsQuery({ projectId, filter: auditFilterOf(control.filters, userId) })
  const team = useTeamQuery(projectId)
  const account = useCurrentAccount()
  const [openEvent, setOpenEvent] = useState<Schemas['AuditEvent'] | null>(null)
  const [blockTarget, setBlockTarget] = useState<string | null>(null)
  const events = pages.data?.pages.flatMap((page) => page.events)
  const context: AuditRowContext = {
    projectId,
    memberEmails: emailsById(team.data?.members ?? []),
    currentAccountId: account.id,
  }

  function filterAddress(address: string): void {
    setOpenEvent(null)
    control.showAddress(address)
  }

  return (
    <div className="flex flex-col gap-3">
      <LogToolbar
        control={control}
        shownCount={events?.length ?? null}
        hasMore={pages.hasNextPage}
      />
      <div className="min-w-0 overflow-hidden rounded-xl border bg-card">
        <ActivityFeedBody
          events={events}
          pages={pages}
          view={{
            context,
            showsUser: userId === undefined,
            filters: control.filters,
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

function emailsById(members: Schemas['TeamMember'][]): ReadonlyMap<string, string> {
  return new Map(members.map((member) => [member.account_id, member.email]))
}
