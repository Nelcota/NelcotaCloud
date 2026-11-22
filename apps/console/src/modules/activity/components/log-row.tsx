import type { JSX, MouseEvent } from 'react'

import { clockTime } from '@/modules/activity/components/audit-dates'
import { detailText } from '@/modules/activity/components/audit-event-details'
import {
  type EventTone,
  ACTION_ICONS,
  toneOf,
} from '@/modules/activity/components/audit-event-kinds'
import { actionText, originText } from '@/modules/activity/components/audit-event-text'
import { AuditEventUser } from '@/modules/activity/components/audit-event-user'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { RequestIdCell } from '@/modules/activity/components/request-id-cell'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { cn } from '@/shared/lib/utils'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type AuditEvent = components['schemas']['AuditEvent']

const ICON_TONES: Record<EventTone, string> = {
  failure: 'text-destructive',
  security: 'text-warning',
  neutral: 'text-muted-foreground',
}

export type LogRowView = {
  context: AuditRowContext
  /** One user's page leaves the column out: every row is theirs. */
  showsUser: boolean
  onOpen: (event: AuditEvent) => void
}

type LogRowProps = { event: AuditEvent; view: LogRowView }

/** One event; its name is the button, and a click anywhere else on the row opens it too. */
export function LogRow({ event, view }: LogRowProps): JSX.Element {
  const Glyph = ACTION_ICONS[event.action]
  const detail = detailText(event)
  const origin = originText(event, view.context)

  return (
    <TableRow className="cursor-pointer" onClick={(click) => openUnlessControl(click, event, view)}>
      <TableCell className="py-2 font-mono text-xs text-muted-foreground">
        <LogTime occurredAt={event.occurred_at} />
      </TableCell>
      <TableCell className="py-2">
        <div className="flex max-w-lg min-w-0 items-center gap-2">
          <Glyph aria-hidden className={cn('size-4 shrink-0', ICON_TONES[toneOf(event.action)])} />
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => view.onOpen(event)}
            className="shrink-0 rounded-sm text-start font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            {actionText(event)}
          </button>
          <span title={detail} className="min-w-0 truncate text-muted-foreground">
            {detail}
          </span>
        </div>
      </TableCell>
      {view.showsUser && (
        <TableCell className="py-2">
          <UserCell event={event} projectId={view.context.projectId} />
        </TableCell>
      )}
      <TableCell className="hidden py-2 text-muted-foreground lg:table-cell">
        <span title={origin} className="block max-w-56 truncate">
          {origin}
        </span>
      </TableCell>
      <TableCell className="hidden py-2 font-mono text-xs sm:table-cell">
        {event.ip_address ?? <Missing />}
      </TableCell>
      <TableCell className="hidden py-1 md:table-cell">
        <RequestIdCell requestId={event.request_id ?? null} />
      </TableCell>
    </TableRow>
  )
}

/** The row's own links and buttons (user, copy, the name itself) keep their click. */
function openUnlessControl(
  click: MouseEvent<HTMLTableRowElement>,
  event: AuditEvent,
  view: LogRowView,
): void {
  const target = click.target

  if (target instanceof Element && target.closest('a, button') !== null) {
    return
  }

  view.onOpen(event)
}

function UserCell({ event, projectId }: { event: AuditEvent; projectId: string }): JSX.Element {
  if (event.email === null || event.email === undefined) {
    return <Missing />
  }

  return <AuditEventUser event={event} projectId={projectId} />
}

function Missing(): JSX.Element {
  return <span className="text-muted-foreground">—</span>
}

function LogTime({ occurredAt }: { occurredAt: string }): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={occurredAt} className="tabular-nums">
          {clockTime(occurredAt)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(occurredAt)}</TooltipContent>
    </Tooltip>
  )
}
