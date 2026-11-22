import type { JSX } from 'react'

import { eventLabelOf } from '@/modules/overview/components/event-labels'
import { EventTime } from '@/modules/overview/components/event-time'
import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'
import { StatusDot } from '@/shared/ui/status-dot'

type AuditEvent = components['schemas']['AuditEvent']

const MISSING = '—'
/** Who acted when the event names no user: an admin action has no email to show. */
const ACTORS: Record<AuditEvent['actor'], string> = {
  user: MISSING,
  secret_key: 'Secret key',
  console_account: 'Console',
}
const CELL = 'col-start-2 truncate @min-[40rem]:col-start-auto'

type RecentEventRowProps = { event: AuditEvent; projectId: string }

/** One event as a log line: time, what happened, who and from where. */
export function RecentEventRow({ event, projectId }: RecentEventRowProps): JSX.Element {
  const label = eventLabelOf(event.action)
  const ipAddress = event.ip_address ?? MISSING

  return (
    <li className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-0.5 px-5 py-2.5 @min-[40rem]:grid-cols-[5.5rem_12rem_minmax(0,1fr)_9rem]">
      <EventTime value={event.occurred_at} />
      <span className="flex min-w-0 items-center gap-2 text-sm text-heading">
        <StatusDot tone={label.tone} label={label.label} />
        <span className="truncate">{label.label}</span>
      </span>
      <EventUser event={event} projectId={projectId} />
      <code
        title={ipAddress}
        className={`${CELL} font-mono text-xs text-muted-foreground @min-[40rem]:text-right`}
      >
        {ipAddress}
      </code>
    </li>
  )
}

function EventUser({ event, projectId }: RecentEventRowProps): JSX.Element {
  const { email, user_id: userId } = event

  if (email === null || email === undefined) {
    return <span className={`${CELL} text-sm text-muted-foreground`}>{ACTORS[event.actor]}</span>
  }

  if (userId === null || userId === undefined) {
    return (
      <span title={email} className={`${CELL} text-sm text-muted-foreground`}>
        {email}
      </span>
    )
  }

  return (
    <RouterLink
      href={`/projects/${projectId}/users/${userId}`}
      title={email}
      className={`${CELL} text-sm text-foreground underline-offset-4 hover:underline`}
    >
      {email}
    </RouterLink>
  )
}
