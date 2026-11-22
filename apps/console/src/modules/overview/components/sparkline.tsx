import type { JSX } from 'react'

import { areaPath, linePath, type Range } from '@/modules/overview/components/growth-geometry'
import { cn } from '@/shared/lib/utils'

type SparklineProps = {
  values: readonly number[]
  /** A shared floor: counts start at zero, a running total on its own range. */
  range?: Range
  className?: string
}

/** A small trend beside a metric. Decorative: the figure next to it says the same in words. */
export function Sparkline({ values, range, className }: SparklineProps): JSX.Element | null {
  if (values.length < 2) {
    return null
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn('h-9 w-24 shrink-0 overflow-visible text-chart-1', className)}
    >
      <path d={areaPath(values, range)} fill="currentColor" fillOpacity={0.1} />
      <path
        d={linePath(values, range)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
