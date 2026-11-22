import { KeyRound, ShieldAlert, TriangleAlert, User } from 'lucide-react'
import type { JSX } from 'react'

import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { levelOf } from '@/modules/activity/components/log-levels'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'

type AuditEvent = components['schemas']['AuditEvent']

const TILE = 'grid size-8 shrink-0 place-items-center rounded-full text-xs font-medium uppercase'

type EventAvatarProps = { event: AuditEvent; context: AuditRowContext }

/** Who acted, at a glance: an alarm for refusals, a key for the secret key, else an initial. */
export function EventAvatar({ event, context }: EventAvatarProps): JSX.Element {
  const level = levelOf(event.action)

  if (level === 'error') {
    return (
      <span aria-hidden className={cn(TILE, 'bg-destructive/12 text-destructive')}>
        <ShieldAlert className="size-4" />
      </span>
    )
  }

  if (level === 'warn') {
    return (
      <span aria-hidden className={cn(TILE, 'bg-warning/12 text-warning')}>
        <TriangleAlert className="size-4" />
      </span>
    )
  }

  return <ActorAvatar event={event} context={context} />
}

function ActorAvatar({ event, context }: EventAvatarProps): JSX.Element {
  if (event.actor === 'secret_key') {
    return (
      <span aria-hidden className={cn(TILE, 'bg-surface text-muted-foreground')}>
        <KeyRound className="size-4" />
      </span>
    )
  }

  const initial = actorEmail(event, context).charAt(0)

  if (initial === '') {
    return (
      <span aria-hidden className={cn(TILE, 'bg-surface text-muted-foreground')}>
        <User className="size-4" />
      </span>
    )
  }

  return (
    <span aria-hidden className={cn(TILE, 'bg-surface-hover text-foreground')}>
      {initial}
    </span>
  )
}

/** The person behind the event: the user for their own actions, the member for the console's. */
function actorEmail(event: AuditEvent, context: AuditRowContext): string {
  if (event.actor === 'user') {
    return event.email ?? ''
  }

  return context.memberEmails.get(event.actor_account_id ?? '') ?? ''
}
