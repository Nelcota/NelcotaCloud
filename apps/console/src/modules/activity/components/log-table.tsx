import type { JSX } from 'react'
import { useState } from 'react'

import { dayKey, dayLabel } from '@/modules/activity/components/audit-dates'
import { type LogRowView, LogRow } from '@/modules/activity/components/log-row'
import type { components } from '@/shared/api/api-schema'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type AuditEvent = components['schemas']['AuditEvent']

/** Every column there can be, so a day's separator always spans the whole row. */
const COLUMN_COUNT = 6

type LogTableProps = { events: AuditEvent[]; view: LogRowView }

/**
 * The log as a dense table that scrolls inside its frame, so the column titles and the day being
 * read stay pinned at the top.
 */
export function LogTable({ events, view }: LogTableProps): JSX.Element {
  // Read once: "Hoje" and "Ontem" stay put while the page is open.
  const [now] = useState(() => new Date())

  return (
    <div className="scrollbar-thin max-h-[min(70vh,48rem)] overflow-auto overscroll-contain *:data-[slot=table-container]:overflow-visible">
      <Table>
        <TableHeader className="sticky top-0 z-20 shadow-[inset_0_-1px_0_var(--border)] [&_tr]:border-b-0">
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-9 w-28">Hora</TableHead>
            <TableHead className="h-9">Evento</TableHead>
            {view.showsUser && <TableHead className="h-9">Usuário</TableHead>}
            <TableHead className="hidden h-9 lg:table-cell">Origem</TableHead>
            <TableHead className="hidden h-9 sm:table-cell">IP</TableHead>
            <TableHead className="hidden h-9 md:table-cell">Request ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(eventsByDay(events), ([key, dayEvents]) => (
            <LogDay key={key} label={dayLabel(key, now)} events={dayEvents} view={view} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type LogDayProps = { label: string; events: AuditEvent[]; view: LogRowView }

function LogDay({ label, events, view }: LogDayProps): JSX.Element {
  return (
    <>
      <tr>
        <th
          scope="colgroup"
          colSpan={COLUMN_COUNT}
          className="sticky top-9 z-10 border-b bg-card/95 px-4 py-1.5 text-start text-xs font-medium text-muted-foreground backdrop-blur-sm"
        >
          {label}
          <span className="font-normal tabular-nums"> · {eventCountText(events.length)}</span>
        </th>
      </tr>
      {events.map((event) => (
        <LogRow key={event.id} event={event} view={view} />
      ))}
    </>
  )
}

function eventCountText(count: number): string {
  if (count === 1) {
    return '1 evento'
  }

  return `${count} eventos`
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
