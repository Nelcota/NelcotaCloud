import type { JSX, ReactNode } from 'react'

import { OriginText } from '@/modules/activity/components/activity-event-cell'
import { EventTime, EventUser } from '@/modules/activity/components/audit-event-parts'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import {
  CELL_UNDER_ICON,
  CELL_X,
  CELL_Y,
  COLUMN_CLASSES,
} from '@/modules/activity/components/audit-row-style'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { TableCell } from '@/shared/ui/table'

type AuditEvent = components['schemas']['AuditEvent']

type UserCellProps = { showsUser: boolean; children: ReactNode }

/** Left out on a user's own page, where every event is about them. */
export function UserCell({ showsUser, children }: UserCellProps): JSX.Element | null {
  if (showsUser === false) {
    return null
  }

  // One line: the column only shows on wide tables, and its width then comes from the email.
  return (
    <TableCell
      className={cn(COLUMN_CLASSES.user, CELL_UNDER_ICON, CELL_Y, 'w-px whitespace-nowrap')}
    >
      {children}
    </TableCell>
  )
}

type IdentityProps = { event: AuditEvent; context: AuditRowContext }

/** The account's email; a dash when the event names no account. */
export function UserIdentity({ event, context }: IdentityProps): JSX.Element {
  const email = event.email ?? null

  if (email === null) {
    return <span className="text-muted-foreground">—</span>
  }

  return <EventUser event={event} context={context} />
}

type OriginCellProps = { actor: string; address: string | null; onSearch?: (text: string) => void }

/** Who did it and from where, on one line like the rest of the row. */
export function OriginCell(props: OriginCellProps): JSX.Element {
  return (
    <TableCell
      className={cn(
        COLUMN_CLASSES.origin,
        CELL_UNDER_ICON,
        CELL_Y,
        // Secondary, so a step smaller, and on one line: wrapping it made every refused login
        // two lines tall.
        'text-muted-foreground w-px text-sm whitespace-nowrap [&>span]:flex-nowrap',
      )}
    >
      <OriginText actor={props.actor} address={props.address} onSearch={props.onSearch} />
    </TableCell>
  )
}

type WhenCellProps = { at: string; time?: string; isMuted?: boolean }

/** The time of day, in its own column once the table is wide enough for one. */
export function WhenCell({ at, time, isMuted }: WhenCellProps): JSX.Element {
  return (
    <TableCell
      className={cn(
        COLUMN_CLASSES.time,
        CELL_X,
        CELL_Y,
        'text-muted-foreground text-right tabular-nums',
        isMuted && 'text-sm',
      )}
    >
      <EventTime at={at} time={time} />
    </TableCell>
  )
}

/** Keeps the hidden-or-shown columns lined up in rows that have nothing to put in them. */
export function BlankCells({ showsUser }: { showsUser: boolean }): JSX.Element {
  return (
    <>
      <UserCell showsUser={showsUser}>{null}</UserCell>
      <TableCell className={COLUMN_CLASSES.origin} />
    </>
  )
}
