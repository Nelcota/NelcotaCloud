import type { JSX, MouseEvent } from 'react'

import { AuditEventUser } from '@/modules/activity/components/audit-event-user'
import { detailText } from '@/modules/activity/components/audit-event-details'
import { actionText, originText } from '@/modules/activity/components/audit-event-text'
import { EventAvatar } from '@/modules/activity/components/event-avatar'
import { EventStatus } from '@/modules/activity/components/event-status'
import type { FeedRowView } from '@/modules/activity/components/feed-row-view'
import type { components } from '@/shared/api/api-schema'
import { Timestamp } from '@/shared/ui/timestamp'

type AuditEvent = components['schemas']['AuditEvent']

type ActivityRowProps = { event: AuditEvent; view: FeedRowView }

/** One event: who acted, what happened and to whom, then where from and when. */
export function ActivityRow({ event, view }: ActivityRowProps): JSX.Element {
  return (
    <li className="animate-row-in">
      <div
        onClick={(click) => openUnlessControl(click, event, view)}
        className="flex min-w-0 cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-surface"
      >
        <EventAvatar event={event} context={view.context} />
        <div className="grid min-w-0 flex-1 gap-0.5">
          <p className="flex min-w-0 items-baseline gap-1.5 text-sm">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => view.onOpen(event)}
              className="shrink-0 rounded-sm text-start font-medium text-heading hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              {actionText(event)}
            </button>
            <EventTarget event={event} view={view} />
          </p>
          <EventMeta event={event} view={view} />
        </div>
        <EventStatus action={event.action} />
      </div>
    </li>
  )
}

/** The account or the thing the event is about, after what happened. */
function EventTarget({ event, view }: ActivityRowProps): JSX.Element | null {
  const detail = detailText(event)
  const email = shownEmail(event, view)

  if (email === null && detail === '') {
    return null
  }

  return (
    <span className="flex min-w-0 items-baseline gap-1.5 text-muted-foreground">
      {email !== null && <AuditEventUser event={event} projectId={view.context.projectId} />}
      {email !== null && detail !== '' && <span aria-hidden>·</span>}
      <span title={detail} className="min-w-0 truncate empty:hidden">
        {detail}
      </span>
    </span>
  )
}

/** The user's email, except on one user's own page, where every row is theirs. */
function shownEmail(event: AuditEvent, view: FeedRowView): string | null {
  if (view.showsUser === false) {
    return null
  }

  return event.email ?? null
}

function EventMeta({ event, view }: ActivityRowProps): JSX.Element {
  const ipAddress = event.ip_address ?? ''

  return (
    <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <span>{originText(event, view.context)}</span>
      {ipAddress !== '' && (
        <>
          <span aria-hidden>·</span>
          <code className="font-mono text-2xs">{ipAddress}</code>
        </>
      )}
      <span aria-hidden>·</span>
      <Timestamp value={event.occurred_at} format="relative" />
    </p>
  )
}

/** The row's own controls (the event, the user link) keep their click. */
function openUnlessControl(
  click: MouseEvent<HTMLDivElement>,
  event: AuditEvent,
  view: FeedRowView,
): void {
  const target = click.target

  if (target instanceof Element && target.closest('a, button') !== null) {
    return
  }

  view.onOpen(event)
}
