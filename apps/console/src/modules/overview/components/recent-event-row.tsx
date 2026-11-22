import type { JSX } from 'react'

import { eventLabelOf } from '@/modules/overview/components/event-labels'
import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'
import { ActivityItem } from '@/shared/ui/activity-item'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type AuditEvent = components['schemas']['AuditEvent']

/** Who acted when the event names no user: an admin action has no email to show. */
const ACTORS: Record<AuditEvent['actor'], string> = {
  user: 'Conta sem email',
  secret_key: 'Chave secreta',
  console_account: 'Console',
}

type RecentEventRowProps = { event: AuditEvent; projectId: string }

/** One event of the feed: who first, where and when in a quiet line, what happened on the right. */
export function RecentEventRow({ event, projectId }: RecentEventRowProps): JSX.Element {
  const label = eventLabelOf(event.action)

  return (
    <li>
      <ActivityItem
        title={<EventUser event={event} projectId={projectId} />}
        meta={metaOf(event)}
        status={<StatusBadge tone={label.tone}>{label.label}</StatusBadge>}
      />
    </li>
  )
}

function metaOf(event: AuditEvent): JSX.Element[] {
  const time = <Timestamp key="time" value={event.occurred_at} format="relative" />

  if (event.ip_address === null || event.ip_address === undefined) {
    return [time]
  }

  return [
    <code key="ip" className="font-mono">
      {event.ip_address}
    </code>,
    time,
  ]
}

function EventUser({ event, projectId }: RecentEventRowProps): JSX.Element {
  const { email, user_id: userId } = event

  if (email === null || email === undefined) {
    return <span className="text-muted-foreground">{ACTORS[event.actor]}</span>
  }

  if (userId === null || userId === undefined) {
    return <span title={email}>{email}</span>
  }

  return (
    <RouterLink
      href={`/projects/${projectId}/users/${userId}`}
      title={email}
      className="underline-offset-4 hover:underline"
    >
      {email}
    </RouterLink>
  )
}
