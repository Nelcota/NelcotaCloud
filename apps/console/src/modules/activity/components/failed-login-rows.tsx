import AltArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'
import { useId, useState } from 'react'

import {
  EventCell,
  OriginText,
  StandInLines,
  TitleLine,
} from '@/modules/activity/components/activity-event-cell'
import {
  BlankCells,
  OriginCell,
  UserCell,
  UserIdentity,
  WhenCell,
} from '@/modules/activity/components/activity-table-cells'
import { actorName } from '@/modules/activity/components/audit-actor-name'
import { EventTime, EventUser } from '@/modules/activity/components/audit-event-parts'
import { failureReason } from '@/modules/activity/components/audit-labels'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { STAND_IN_CLASSES, THREAT_TONE } from '@/modules/activity/components/audit-row-style'
import { burstEmails } from '@/modules/activity/model/failed-login-bursts'
import type { components } from '@/shared/api/api-schema'
import { formatPreciseTime, formatTime } from '@/shared/lib/format-date'
import { cn } from '@/shared/lib/class-names'
import { TableCell, TableRow } from '@/shared/ui/table'

type AuditEvent = components['schemas']['AuditEvent']

type FailedLoginRowsProps = { events: AuditEvent[]; context: AuditRowContext }

/**
 * Refused logins in a row from one IP, in the threat tone, since a burst is what an attack
 * looks like. It opens to each attempt's exact time.
 */
export function FailedLoginRows({ events, context }: FailedLoginRowsProps): JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false)
  const baseId = useId()
  const newest = events.at(0)
  const oldest = events.at(-1)

  if (newest === undefined || oldest === undefined) {
    return null
  }

  const emails = burstEmails(events)
  const actor = actorName(newest, context.memberEmails)
  const address = newest.ip_address ?? null
  const attemptIds = events.map((event) => `${baseId}-${event.id}`)
  const accounts = <BurstAccounts newest={newest} count={emails.length} context={context} />
  const timeRange = `${formatTime(oldest.occurred_at)}–${formatTime(newest.occurred_at)}`

  return (
    <>
      <TableRow className="group/row">
        <EventCell
          action="login_failed"
          title={
            <TitleLine
              title={
                <BurstToggle
                  count={events.length}
                  isOpen={isOpen}
                  controls={attemptIds.join(' ')}
                  onToggle={() => setIsOpen(isOpen === false)}
                />
              }
              time={<EventTime at={newest.occurred_at} time={timeRange} />}
            />
          }
        >
          <StandInLines
            user={accounts}
            origin={<OriginText actor={actor} address={address} onSearch={context.onSearch} />}
            showsUser={context.showsUser}
          />
        </EventCell>
        <UserCell showsUser={context.showsUser}>
          <BurstIdentity newest={newest} count={emails.length} context={context} />
        </UserCell>
        <OriginCell actor={actor} address={address} onSearch={context.onSearch} />
        <WhenCell at={newest.occurred_at} time={timeRange} />
      </TableRow>
      <Attempts events={events} ids={attemptIds} context={context} isOpen={isOpen} />
    </>
  )
}

type BurstToggleProps = { count: number; isOpen: boolean; controls: string; onToggle: () => void }

function BurstToggle({ count, isOpen, controls, onToggle }: BurstToggleProps): JSX.Element {
  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        THREAT_TONE,
        'group inline-flex min-h-6 w-fit items-center gap-1 rounded-sm text-left font-semibold',
      )}
    >
      {count} logins recusados
      <AltArrowDown
        aria-hidden="true"
        className="size-3.5 transition-transform group-aria-expanded:rotate-180 motion-reduce:transition-none"
      />
    </button>
  )
}

type BurstAccountsProps = { newest: AuditEvent; count: number; context: AuditRowContext }

/** The account tried, or how many when one IP tried several. */
function BurstAccounts({ newest, count, context }: BurstAccountsProps): JSX.Element {
  if (count > 1) {
    return <span>{count} contas</span>
  }

  return <EventUser event={newest} context={context} />
}

function BurstIdentity({ newest, count, context }: BurstAccountsProps): JSX.Element {
  if (count > 1) {
    return <span className="text-muted-foreground">{count} contas</span>
  }

  return <UserIdentity event={newest} context={context} />
}

type AttemptsProps = FailedLoginRowsProps & { ids: string[]; isOpen: boolean }

/** Each attempt's exact time and why it was refused; the account too when the IP tried several. */
function Attempts({ events, ids, context, isOpen }: AttemptsProps): JSX.Element | null {
  if (isOpen === false) {
    return null
  }

  const showsEmail = burstEmails(events).length > 1

  return (
    <>
      {events.map((event, index) => (
        <TableRow key={event.id} id={ids.at(index)} className="bg-foreground/[0.02]">
          <TableCell className="text-muted-foreground w-full max-w-0 py-2.5 pr-3 pl-11 align-top text-sm whitespace-normal [overflow-wrap:anywhere] @xl:pr-5 @xl:pl-13">
            <div className="flex justify-between gap-3">
              {attemptText(event, showsEmail)}
              <span className={cn('shrink-0 tabular-nums', STAND_IN_CLASSES.time)}>
                <EventTime at={event.occurred_at} time={formatPreciseTime(event.occurred_at)} />
              </span>
            </div>
          </TableCell>
          <BlankCells showsUser={context.showsUser} />
          <WhenCell at={event.occurred_at} time={formatPreciseTime(event.occurred_at)} isMuted />
        </TableRow>
      ))}
    </>
  )
}

/** "Senha incorreta", or "ana@acme.com · senha incorreta" when the burst tried several accounts. */
function attemptText(event: AuditEvent, showsEmail: boolean): string {
  const reason = failureReason(event)
  const email = event.email ?? null

  if (showsEmail === false || email === null) {
    return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`
  }

  return `${email} · ${reason}`
}
