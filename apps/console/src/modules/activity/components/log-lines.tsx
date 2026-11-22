import type { JSX } from 'react'
import { useState } from 'react'

import { dayKey, dayLabel } from '@/modules/activity/components/audit-dates'
import { LogLine } from '@/modules/activity/components/log-line'
import type { LogRowView } from '@/modules/activity/components/log-row-view'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'

type AuditEvent = components['schemas']['AuditEvent']

type LogLinesProps = { events: AuditEvent[]; view: LogRowView }

/** The lines grouped by day, scrolling inside their frame with the day being read pinned on top. */
export function LogLines({ events, view }: LogLinesProps): JSX.Element {
  // Read once: "Hoje" and "Ontem" stay put while the page is open.
  const [now] = useState(() => new Date())

  return (
    <div className="scrollbar-thin max-h-[min(70vh,48rem)] overflow-auto overscroll-contain">
      {Array.from(eventsByDay(events), ([key, dayEvents]) => (
        <LogDay key={key} label={dayLabel(key, now)} events={dayEvents} view={view} />
      ))}
    </div>
  )
}

type LogDayProps = { label: string; events: AuditEvent[]; view: LogRowView }

function LogDay({ label, events, view }: LogDayProps): JSX.Element {
  return (
    <section aria-label={label}>
      <h3 className="sticky top-0 z-10 bg-card/95 px-3 py-1.5 font-mono text-2xs text-muted-foreground backdrop-blur-sm">
        <span className="text-foreground">{label}</span>
        <span className="tabular-nums"> · {eventCountText(events.length)}</span>
      </h3>
      <ol>
        {events.map((event) => (
          <LogLine key={event.id} event={event} view={view} />
        ))}
      </ol>
    </section>
  )
}

function eventCountText(count: number): string {
  if (count === 1) {
    return '1 evento'
  }

  return `${formatCount(count)} eventos`
}

function eventsByDay(events: AuditEvent[]): Map<string, AuditEvent[]> {
  const days = new Map<string, AuditEvent[]>()

  for (const event of events) {
    const key = dayKey(event.occurred_at)
    const sameDay = days.get(key) ?? []
    sameDay.push(event)
    days.set(key, sameDay)
  }

  return days
}
