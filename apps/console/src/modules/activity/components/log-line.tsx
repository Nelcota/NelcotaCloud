import { ChevronRight } from 'lucide-react'
import type { JSX, MouseEvent } from 'react'

import { logClockTime } from '@/modules/activity/components/audit-dates'
import { detailText } from '@/modules/activity/components/audit-event-details'
import { actionText } from '@/modules/activity/components/audit-event-text'
import { LogFactChips } from '@/modules/activity/components/log-fact-chips'
import { logFactsOf } from '@/modules/activity/components/log-line-facts'
import { levelOf } from '@/modules/activity/components/log-levels'
import type { LogRowView } from '@/modules/activity/components/log-row-view'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { cn } from '@/shared/lib/utils'
import { type LogLevel, LevelBadge } from '@/shared/ui/level-badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type AuditEvent = components['schemas']['AuditEvent']

const MESSAGE_TONES: Record<LogLevel, string> = {
  info: 'text-foreground',
  warn: 'text-foreground',
  error: 'text-destructive',
}

type LogLineProps = { event: AuditEvent; view: LogRowView }

/** One event as a log line; its message is the button, and a click anywhere else opens it too. */
export function LogLine({ event, view }: LogLineProps): JSX.Element {
  const level = levelOf(event.action)
  const detail = detailText(event)

  return (
    <li className="animate-row-in">
      <div
        onClick={(click) => openUnlessControl(click, event, view)}
        className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 px-3 py-2 transition-colors duration-200 hover:bg-surface"
      >
        <ChevronRight aria-hidden className="mt-0.5 size-3 text-faint" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-mono text-2xs">
          <LogTime occurredAt={event.occurred_at} />
          <LevelBadge level={level} />
          <LogFactChips facts={logFactsOf(event, view)} />
        </div>
        <div className="col-start-2 flex min-w-0 items-baseline gap-2 font-mono text-xs">
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => view.onOpen(event)}
            className={cn(
              'shrink-0 rounded-sm text-start font-medium hover:underline focus-visible:outline-2 focus-visible:outline-ring',
              MESSAGE_TONES[level],
            )}
          >
            {actionText(event)}
          </button>
          <span title={detail} className="min-w-0 truncate text-muted-foreground">
            {detail}
          </span>
        </div>
      </div>
    </li>
  )
}

/** The line's own buttons (the message, "+N") keep their click. */
function openUnlessControl(
  click: MouseEvent<HTMLDivElement>,
  event: AuditEvent,
  view: LogRowView,
): void {
  const target = click.target

  if (target instanceof Element && target.closest('a, button') !== null) {
    return
  }

  view.onOpen(event)
}

function LogTime({ occurredAt }: { occurredAt: string }): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={occurredAt} className="shrink-0 text-muted-foreground tabular-nums">
          {logClockTime(occurredAt)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDateTime(occurredAt)}</TooltipContent>
    </Tooltip>
  )
}
