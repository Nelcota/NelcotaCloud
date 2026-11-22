import { ChevronDown } from 'lucide-react'
import type { JSX } from 'react'

import { ACTIVITY_SERIES, type DailyActivity } from '@/modules/overview/components/activity-series'
import { longDay } from '@/modules/overview/components/chart-day'
import { Button } from '@/shared/ui/primitives/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/primitives/collapsible'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'

const TABLE_HEIGHT = 'max-h-72'

/** The chart's numbers day by day, newest first, folded until asked for. */
export function DailyTable({ days }: { days: DailyActivity[] }): JSX.Element {
  const newestFirst = days.toReversed()

  return (
    <Collapsible className="grid gap-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="group -ms-3 justify-self-start">
          Ver por dia
          <ChevronDown
            aria-hidden
            data-icon="inline-end"
            className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`${TABLE_HEIGHT} scrollbar-thin overflow-auto rounded-lg border`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dia (UTC)</TableHead>
                {ACTIVITY_SERIES.map((series) => (
                  <TableHead key={series.id} className="text-right">
                    {series.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {newestFirst.map((day) => (
                <TableRow key={day.date}>
                  <TableCell>{longDay(day.date)}</TableCell>
                  {ACTIVITY_SERIES.map((series) => (
                    <TableCell key={series.id} className="text-right tabular-nums">
                      {day[series.id].toLocaleString('pt-BR')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
