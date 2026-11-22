import type { JSX } from 'react'
import { useState } from 'react'

import { ActivityRow } from '@/modules/activity/components/activity-row'
import { dayKey, dayLabel } from '@/modules/activity/components/audit-dates'
import type { FeedRowView } from '@/modules/activity/components/feed-row-view'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'

type AuditEvent = components['schemas']['AuditEvent']

type ActivityDaysProps = { events: AuditEvent[]; view: FeedRowView }

/** The events grouped by the reader's day, with the day being read pinned on top. */
export function ActivityDays({ events, view }: ActivityDaysProps): JSX.Element {
  // Read once: "Hoje" and "Ontem" stay put while the page is open.
  const [now] = useState(() => new Date())

  return (
    <div className="flex flex-col gap-2">
      {Array.from(eventsByDay(events), ([key, dayEvents]) => (
        <ActivityDay key={key} label={dayLabel(key, now)} events={dayEvents} view={view} />
      ))}
    </div>
  )
}

type ActivityDayProps = { label: string; events: AuditEvent[]; view: FeedRowView }

function ActivityDay({ label, events, view }: ActivityDayProps): JSX.Element {
  return (
    <section aria-label={label}>
      <h3 className="sticky top-0 z-10 flex items-baseline gap-1.5 rounded-t-lg bg-card/95 px-3 pt-2.5 pb-1.5 text-xs backdrop-blur-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-muted-foreground tabular-nums">{eventCountText(events.length)}</span>
      </h3>
      <ol className="flex flex-col">
        {events.map((event) => (
          <ActivityRow key={event.id} event={event} view={view} />
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
