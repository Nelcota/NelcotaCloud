import ClockCircle from '~icons/solar/clock-circle-linear'
import Global from '~icons/solar/global-linear'
import History from '~icons/solar/history-linear'
import User from '~icons/solar/user-linear'
import type { JSX } from 'react'

import { ActivityTableRow } from '@/modules/activity/components/activity-table-row'
import type { AuditRowContext } from '@/modules/activity/components/audit-row-context'
import { CELL_X, COLUMN_CLASSES } from '@/modules/activity/components/audit-row-style'
import { FailedLoginRows } from '@/modules/activity/components/failed-login-rows'
import { type ActivityEntry, groupFailedLogins } from '@/modules/activity/model/failed-login-bursts'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/class-names'
import { formatDayLabel } from '@/shared/lib/format-date'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { TableHeadLabel } from '@/shared/ui/table-head-label'
import { HEAD_CELL, TABLE_HEADER_TINT } from '@/shared/ui/table-styles'

type AuditEvent = components['schemas']['AuditEvent']

/** Column headings at the table's reading size, not the compact default. */
const HEAD_CLASS = cn(CELL_X, HEAD_CELL)

/** Spans every column, shown or not, so a day heading always crosses the whole table. */
const ALL_COLUMNS = 4

type ActivityTableProps = { events: readonly AuditEvent[]; context: AuditRowContext }

/**
 * The log as a table, split by day: what happened, to whom, from where and when. A size
 * container, so its columns follow the width it gets, not the window's.
 */
export function ActivityTable({ events, context }: ActivityTableProps): JSX.Element {
  const days = splitByDay(groupFailedLogins(events))

  return (
    <div className="@container">
      <Table aria-label="Eventos de atividade" className="text-base">
        <TableHeader className={TABLE_HEADER_TINT}>
          <TableRow>
            <TableHead className={HEAD_CLASS}>
              <TableHeadLabel icon={History}>Evento</TableHeadLabel>
            </TableHead>
            <UserHead showsUser={context.showsUser} />
            <TableHead className={cn(HEAD_CLASS, COLUMN_CLASSES.origin)}>
              <TableHeadLabel icon={Global}>Origem</TableHeadLabel>
            </TableHead>
            <TableHead className={cn(HEAD_CLASS, COLUMN_CLASSES.time, 'text-right')}>
              <TableHeadLabel icon={ClockCircle}>Hora</TableHeadLabel>
            </TableHead>
          </TableRow>
        </TableHeader>
        {days.map((day) => (
          <TableBody key={day.key}>
            <TableRow className="hover:bg-transparent">
              <th
                scope="rowgroup"
                colSpan={ALL_COLUMNS}
                className={cn(
                  CELL_X,
                  'text-muted-foreground pt-5 pb-2 text-left text-sm font-semibold',
                )}
              >
                {day.label}
              </th>
            </TableRow>
            {day.entries.map((entry) => (
              <EntryRows key={keyOf(entry)} entry={entry} context={context} />
            ))}
          </TableBody>
        ))}
      </Table>
    </div>
  )
}

function UserHead({ showsUser }: { showsUser: boolean }): JSX.Element | null {
  if (showsUser === false) {
    return null
  }

  return (
    <TableHead className={cn(HEAD_CLASS, COLUMN_CLASSES.user)}>
      <TableHeadLabel icon={User}>Usuário</TableHeadLabel>
    </TableHead>
  )
}

function EntryRows(props: { entry: ActivityEntry; context: AuditRowContext }): JSX.Element {
  const entry = props.entry

  if (entry.kind === 'burst') {
    return <FailedLoginRows events={entry.events} context={props.context} />
  }

  return <ActivityTableRow event={entry.event} context={props.context} />
}

type Day = { key: number; label: string; entries: ActivityEntry[] }

/** Consecutive entries of the same day, in the log's order; a day never merges across a gap. */
function splitByDay(entries: readonly ActivityEntry[]): Day[] {
  const days: Day[] = []

  for (const entry of entries) {
    const label = formatDayLabel(newestDateOf(entry))
    const day = days.at(-1)

    if (day !== undefined && day.label === label) {
      day.entries.push(entry)
      continue
    }

    days.push({ key: keyOf(entry), label, entries: [entry] })
  }

  return days
}

function newestDateOf(entry: ActivityEntry): string {
  if (entry.kind === 'burst') {
    return entry.events.at(0)?.occurred_at ?? ''
  }

  return entry.event.occurred_at
}

function keyOf(entry: ActivityEntry): number {
  if (entry.kind === 'burst') {
    return entry.events.at(0)?.id ?? 0
  }

  return entry.event.id
}
