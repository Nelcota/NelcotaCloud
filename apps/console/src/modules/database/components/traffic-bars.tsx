import type { JSX } from 'react'

import type { ApiUsagePeriod, ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { formatCount } from '@/shared/lib/format-number'

type UsagePoint = ApiUsageReport['series'][number]

type TrafficBarsProps = { series: readonly UsagePoint[]; period: ApiUsagePeriod }

const HOUR = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/**
 * One bar per hour or day, errors stacked on top in red. Decorative for screen readers: the
 * figures above say the same in words; each bar's title gives its numbers on hover.
 */
export function TrafficBars({ series, period }: TrafficBarsProps): JSX.Element | null {
  const first = series[0]
  const last = series.at(-1)

  if (first === undefined || last === undefined) {
    return null
  }

  const top = Math.max(1, ...series.map((point) => point.requests))

  return (
    <div className="grid gap-2">
      <div aria-hidden className="flex h-40 items-end gap-0.5 border-b border-dashed">
        {series.map((point) => (
          <Bar key={point.start} point={point} top={top} period={period} />
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
        <span>{pointLabel(first.start, period)}</span>
        <span>{pointLabel(last.start, period)}</span>
      </div>
    </div>
  )
}

type BarProps = { point: UsagePoint; top: number; period: ApiUsagePeriod }

function Bar({ point, top, period }: BarProps): JSX.Element {
  const errors = point.client_errors + point.server_errors
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

function pointLabel(start: string, period: ApiUsagePeriod): string {
  const date = new Date(start)

  if (period === '24h') {
    return HOUR.format(date)
  }

  return DAY.format(date)
}
