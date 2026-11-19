import type { JSX, ReactNode } from 'react'

import { ACTION_ICONS } from '@/modules/activity/components/audit-action-icons'
import { EventAddress } from '@/modules/activity/components/audit-event-parts'
import {
  CELL_X,
  CELL_Y,
  STAND_IN_CLASSES,
  THREAT_TONE,
} from '@/modules/activity/components/audit-row-style'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { TableCell } from '@/shared/ui/table'

type AuditAction = components['schemas']['AuditAction']

type EventCellProps = {
  action: AuditAction
  /** What happened, as text or as the burst's toggle, with the time beside it on narrow rows. */
  title: ReactNode
  /** The lines that stand in for the user and origin columns while they do not fit. */
  children: ReactNode
}

/** A refused login's icon takes the threat tone, so the eye finds it before reading. */
const ICON_TONES: Partial<Record<AuditAction, string>> = { login_failed: THREAT_TONE }

/**
 * The event's icon and what happened; the hidden columns' content goes under it. On wide
 * tables it stops taking all the spare width, which left a gap before the user column.
 */
export function EventCell({ action, title, children }: EventCellProps): JSX.Element {
  const Icon = ACTION_ICONS[action]

  return (
    <TableCell className={cn(CELL_X, CELL_Y, 'w-full max-w-0 whitespace-normal')}>
      <div className="flex items-start gap-3">
        <Icon
          aria-hidden="true"
          className={cn('text-muted-foreground mt-0.5 size-5 shrink-0', ICON_TONES[action])}
        />
        <div className="grid min-w-0 flex-1 gap-1">
          {title}
          {children}
        </div>
      </div>
    </TableCell>
  )
}

type TitleLineProps = { title: ReactNode; time: ReactNode }

/** The title, with the time at its right while the time column does not fit. */
export function TitleLine({ title, time }: TitleLineProps): JSX.Element {
  return (
    <div className="flex items-start justify-between gap-3">
      {title}
      <span className={cn('text-muted-foreground shrink-0 tabular-nums', STAND_IN_CLASSES.time)}>
        {time}
      </span>
    </div>
  )
}

type StandInLinesProps = { user: ReactNode; origin: ReactNode; showsUser: boolean }

export function StandInLines({ user, origin, showsUser }: StandInLinesProps): JSX.Element {
  return (
    <>
      <UserStandIn user={user} showsUser={showsUser} />
      <div className={cn('text-muted-foreground pr-7 text-sm', STAND_IN_CLASSES.origin)}>
        {origin}
      </div>
    </>
  )
}

function UserStandIn(props: { user: ReactNode; showsUser: boolean }): JSX.Element | null {
  if (props.showsUser === false) {
    return null
  }

  return (
    <div className={cn('text-muted-foreground pr-7 text-sm', STAND_IN_CLASSES.user)}>
      {props.user}
    </div>
  )
}

type OriginTextProps = { actor: string; address: string | null; onSearch?: (text: string) => void }

/** Who did it and from which IP, on one line: "Desconhecido · 177.54.9.27". */
export function OriginText({ actor, address, onSearch }: OriginTextProps): JSX.Element {
  if (address === null) {
    return <span>{actor}</span>
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      {actor}
      <span aria-hidden="true">·</span>
      <EventAddress address={address} onSearch={onSearch} />
    </span>
  )
}
