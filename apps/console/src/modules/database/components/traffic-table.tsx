import { ChevronDown } from 'lucide-react'
import type { JSX } from 'react'

import type { ApiUsagePeriod, ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { pointLabel } from '@/modules/database/components/traffic-point-label'
import { formatCount } from '@/shared/lib/format-number'
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

type UsagePoint = ApiUsageReport['series'][number]

type TrafficTableProps = { series: readonly UsagePoint[]; period: ApiUsagePeriod }

const NUMBER_CELL = 'text-end tabular-nums'

const UNITS: Record<ApiUsagePeriod, { trigger: string; heading: string }> = {
  '24h': { trigger: 'Ver por hora', heading: 'Hora' },
  '7d': { trigger: 'Ver por dia', heading: 'Dia (UTC)' },
  '30d': { trigger: 'Ver por dia', heading: 'Dia (UTC)' },
}

/** The bars' numbers point by point, newest first, folded until asked for. */
export function TrafficTable({ series, period }: TrafficTableProps): JSX.Element {
  const newestFirst = series.toReversed()
  const unit = UNITS[period]

  return (
    <Collapsible className="grid gap-3">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="group -ms-3 justify-self-start">
          {unit.trigger}
          <ChevronDown
            aria-hidden
            data-icon="inline-end"
            className="transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="scrollbar-thin max-h-72 overflow-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{unit.heading}</TableHead>
                <TableHead className="text-end">Requisições</TableHead>
                <TableHead className="text-end">Com erro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newestFirst.map((point) => (
                <TableRow key={point.start}>
                  <TableCell>{pointLabel(point.start, period)}</TableCell>
                  <TableCell className={NUMBER_CELL}>{formatCount(point.requests)}</TableCell>
                  <TableCell className={NUMBER_CELL}>
                    {formatCount(point.client_errors + point.server_errors)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
