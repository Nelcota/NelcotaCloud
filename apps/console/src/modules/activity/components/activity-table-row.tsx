import type { JSX } from 'react'

import {
  EventCell,
  OriginText,
  StandInLines,
  TitleLine,
} from '@/modules/activity/components/activity-event-cell'
import {
  OriginCell,
  UserCell,
  UserIdentity,
  WhenCell,
} from '@/modules/activity/components/activity-table-cells'
import { actorName } from '@/modules/activity/components/audit-actor-name'
import { EventTime, EventUser } from '@/modules/activity/components/audit-event-parts'
import { actionText } from '@/modules/activity/components/audit-labels'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { actionClass } from '@/modules/activity/components/audit-row-style'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { TableRow } from '@/shared/ui/table'

type AuditEvent = components['schemas']['AuditEvent']

type ActivityTableRowProps = { event: AuditEvent; context: AuditRowContext }

export function ActivityTableRow({ event, context }: ActivityTableRowProps): JSX.Element {
  const actor = actorName(event, context.memberEmails)
  const address = event.ip_address ?? null
  const title = (
    <button
      type="button"
      onClick={() => context.onOpen(event)}
      className={cn(
        actionClass(event.action),
        'min-h-6 w-fit rounded-sm text-left underline-offset-4 hover:underline',
      )}
    >
      {actionText(event)}
    </button>
  )

  return (
    <TableRow className="group/row">
      <EventCell
        action={event.action}
        title={<TitleLine title={title} time={<EventTime at={event.occurred_at} />} />}
      >
        <StandInLines
          user={<EventUser event={event} context={context} />}
          origin={<OriginText actor={actor} address={address} onSearch={context.onSearch} />}
          showsUser={context.showsUser}
        />
      </EventCell>
      <UserCell showsUser={context.showsUser}>
        <UserIdentity event={event} context={context} />
      </UserCell>
      <OriginCell actor={actor} address={address} onSearch={context.onSearch} />
      <WhenCell at={event.occurred_at} />
    </TableRow>
  )
}
