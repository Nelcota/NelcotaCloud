import type { JSX, ReactNode } from 'react'

import type { Range } from '@/modules/overview/components/growth-geometry'
import { DeltaPill } from '@/modules/overview/components/delta-pill'
import { countRange } from '@/modules/overview/components/chart-range'
import { Sparkline } from '@/modules/overview/components/sparkline'
import type { StatFigure } from '@/modules/overview/components/stat-figures'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatCard } from '@/shared/ui/stat-card'

type MetricCardProps = {
  label: string
  figure: StatFigure
  /** What the change compares with ("vs. 30 dias antes"). */
  comparison: ReactNode
  /** Running totals keep their own range; counts start at zero. */
  isRunningTotal?: boolean
}

/** One metric of the row: its figure, how it moved and its trend in the period. */
export function MetricCard({
  label,
  figure,
  comparison,
  isRunningTotal,
}: MetricCardProps): JSX.Element {
  const range = rangeFor(figure.trend, isRunningTotal)

  return (
    <StatCard
      label={label}
      value={<MetricValue value={figure.value} />}
      aside={<Sparkline values={figure.trend} range={range} />}
      hint={<MetricHint figure={figure} comparison={comparison} />}
    />
  )
}

function rangeFor(trend: number[], isRunningTotal: boolean | undefined): Range | undefined {
  if (isRunningTotal === true) {
    return undefined
  }

  return countRange(trend)
}

export function MetricValue({ value }: { value: number | undefined }): JSX.Element {
  if (value === undefined) {
    return <Skeleton className="my-1 h-7 w-20" />
  }

  return <>{value.toLocaleString('pt-BR')}</>
}

type MetricHintProps = { figure: StatFigure; comparison: ReactNode }

function MetricHint({ figure, comparison }: MetricHintProps): JSX.Element {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <DeltaPill change={figure.change} span="em relação ao período anterior" />
      <span className="truncate">{comparison}</span>
    </span>
  )
}
