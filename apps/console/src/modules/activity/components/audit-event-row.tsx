import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ACTION_LABELS, METHOD_LABELS } from '@/modules/activity/components/audit-labels'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'

type AuditEvent = components['schemas']['AuditEvent']

export type AuditRowContext = {
  projectId: string
  /** Console accounts by id, to name the member who acted. */
  memberEmails: ReadonlyMap<string, string>
  /** Off on a user's own page, where every event is about them. */
  showsUser: boolean
}

type AuditEventRowProps = { event: AuditEvent; context: AuditRowContext }

export function AuditEventRow({ event, context }: AuditEventRowProps): JSX.Element {
  return (
    <li className="grid gap-1 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-medium">{actionText(event)}</span>
        <EventUser event={event} context={context} />
        <time dateTime={event.occurred_at} className="text-muted-foreground sm:ml-auto">
          {formatDateTime(event.occurred_at)}
        </time>
      </div>
      <p className="text-muted-foreground">{originText(event, context.memberEmails)}</p>
    </li>
  )
}

function actionText(event: AuditEvent): string {
  const label = ACTION_LABELS[event.action]

  if (event.login_method === null || event.login_method === undefined) {
    return label
  }

  return `${label} com ${METHOD_LABELS[event.login_method]}`
}

function EventUser({ event, context }: AuditEventRowProps): JSX.Element | null {
  const email = event.email ?? null

  if (context.showsUser === false || email === null) {
    return null
  }

  if (event.user_id === null || event.user_id === undefined) {
    return <span className="text-muted-foreground">{email}</span>
  }

  return (
    <Link
      to="/projects/$projectId/users/$userId"
      params={{ projectId: context.projectId, userId: event.user_id }}
      className="text-muted-foreground hover:text-foreground rounded-sm underline-offset-4 hover:underline"
    >
      {email}
    </Link>
  )
}

/** Who acted, and from where when the request came from the user's device. */
function originText(event: AuditEvent, memberEmails: ReadonlyMap<string, string>): string {
  const actor = actorText(event, memberEmails)
  const address = event.ip_address ?? null

  if (address === null) {
    return actor
  }

  return `${actor} · IP ${address}`
}

function actorText(event: AuditEvent, memberEmails: ReadonlyMap<string, string>): string {
  if (event.actor === 'user') {
    return 'Pelo usuário'
  }

  if (event.actor === 'secret_key') {
    return 'Pela chave secreta'
  }

  const accountId = event.actor_account_id ?? ''

  return `Por ${memberEmails.get(accountId) || 'um ex-membro da equipe'}`
}
