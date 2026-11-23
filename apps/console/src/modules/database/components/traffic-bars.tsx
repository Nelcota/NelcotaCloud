import type { JSX } from 'react'

import type { ApiUsagePeriod, ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { pointLabel } from '@/modules/database/components/traffic-point-label'
import { TrafficTable } from '@/modules/database/components/traffic-table'
import { formatCount } from '@/shared/lib/format-number'
import { ChartLegend } from '@/shared/ui/chart-legend'

type UsagePoint = ApiUsageReport['series'][number]

type TrafficBarsProps = { series: readonly UsagePoint[]; period: ApiUsagePeriod }

/**
 * One bar per hour or day, errors stacked on top in red. The legend names both colors, and
 * the table below gives every bar's numbers to keyboards and screen readers.
 */
export function TrafficBars({ series, period }: TrafficBarsProps): JSX.Element | null {
  const first = series[0]
  const last = series.at(-1)

  if (first === undefined || last === undefined) {
    return null
  }

  const top = Math.max(1, ...series.map((point) => point.requests))
  const errors = series.reduce((sum, point) => sum + errorsOf(point), 0)
  const requests = series.reduce((sum, point) => sum + point.requests, 0)

  return (
    <div className="grid gap-3">
      <ChartLegend
        entries={[
          { label: 'Sucesso', color: 'var(--chart-1)', value: Math.max(0, requests - errors) },
          { label: 'Com erro', color: 'var(--destructive)', value: errors },
        ]}
      />
      <div aria-hidden className="flex h-40 items-end gap-0.5 border-b border-dashed">
        {series.map((point) => (
          <Bar key={point.start} point={point} top={top} period={period} />
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
        <span>{pointLabel(first.start, period)}</span>
        <span>{pointLabel(last.start, period)}</span>
      </div>
      <TrafficTable series={series} period={period} />
    </div>
  )
}

function errorsOf(point: UsagePoint): number {
  return point.client_errors + point.server_errors
}

type BarProps = { point: UsagePoint; top: number; period: ApiUsagePeriod }

function Bar({ point, top, period }: BarProps): JSX.Element {
  const errors = errorsOf(point)
  const successes = Math.max(0, point.requests - errors)
  const title = `${pointLabel(point.start, period)}: ${formatCount(point.requests)} requisições, ${formatCount(errors)} com erro`

  return (
    <div title={title} className="flex h-full min-w-0 flex-1 flex-col justify-end">
      <div
        className="rounded-t-[2px] bg-destructive/80"
        style={{ height: `${(errors / top) * 100}%` }}
      />
      <div className="bg-chart-1" style={{ height: `${(successes / top) * 100}%` }} />
    </div>
  )
}
