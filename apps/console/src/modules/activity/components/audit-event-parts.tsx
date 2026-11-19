import Magnifier from '~icons/solar/magnifier-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime, formatTime } from '@/shared/lib/format-date'

type AuditEvent = components['schemas']['AuditEvent']

/**
 * The filter magnifier shows when the row is hovered or the button focused, so rows stay quiet;
 * on touch screens, which have no hover, it is always there. It floats just past the text, in
 * the cell's free space, so it takes no width from the table's columns.
 */
const REVEALED_ON_HOVER =
  'opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100'

type EventUserProps = { event: AuditEvent; context: AuditRowContext }

/** The account the event is about, linked to its page, with a filter for its other events. */
export function EventUser({ event, context }: EventUserProps): JSX.Element | null {
  const email = event.email ?? null

  if (email === null) {
    return null
  }

  return (
    <span className="relative inline-flex max-w-full items-center">
      <EmailText event={event} email={email} projectId={context.projectId} />
      <FilterButton
        text={email}
        label={`Filtrar por e-mail ${email}`}
        onSearch={context.onSearch}
      />
    </span>
  )
}

type EmailTextProps = { event: AuditEvent; email: string; projectId: string }

/** Emails wrap, never truncate: an identity is never cut short. */
function EmailText({ event, email, projectId }: EmailTextProps): JSX.Element {
  if (event.user_id === null || event.user_id === undefined) {
    return <span className="[overflow-wrap:anywhere]">{email}</span>
  }

  return (
    <Link
      to="/projects/$projectId/users/$userId"
      params={{ projectId, userId: event.user_id }}
      className="hover:text-foreground inline-flex min-h-6 items-center rounded-sm [overflow-wrap:anywhere] underline-offset-4 hover:underline"
    >
      {email}
    </Link>
  )
}

type EventAddressProps = { address: string; onSearch?: (text: string) => void }

/** The IP the request came from, with a filter for its other events. */
export function EventAddress({ address, onSearch }: EventAddressProps): JSX.Element {
  return (
    <span className="relative inline-flex items-center tabular-nums">
      {address}
      <FilterButton text={address} label={`Filtrar por IP ${address}`} onSearch={onSearch} />
    </span>
  )
}

type FilterButtonProps = { text: string; label: string; onSearch?: (text: string) => void }

function FilterButton({ text, label, onSearch }: FilterButtonProps): JSX.Element | null {
  if (onSearch === undefined) {
    return null
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => onSearch(text)}
      className={`hover:text-foreground absolute top-1/2 left-full ml-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm ${REVEALED_ON_HOVER}`}
    >
      <Magnifier aria-hidden="true" className="size-4" />
    </button>
  )
}

type EventTimeProps = { at: string; time?: string }

/** The time of day; screen readers also hear the full date, which sighted people get on hover. */
export function EventTime({ at, time }: EventTimeProps): JSX.Element {
  const fullDate = formatDateTime(at)

  return (
    <time dateTime={at} title={fullDate}>
      <span aria-hidden="true">{time ?? formatTime(at)}</span>
      <span className="sr-only">{fullDate}</span>
    </time>
  )
}
