import type { JSX } from 'react'

import { SERIES, SERIES_STROKES } from '@/modules/overview/model/daily-chart-labels'
import { seriesPoints } from '@/modules/overview/model/daily-chart-scale'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

const GRID_LINES = [0, 50, 100]

type DailyChartLinesProps = { days: readonly DailyActivity[]; maximum: number }

/**
 * Hairline gridlines and one 2px line per series. The SVG stretches to the box, so strokes keep
 * their width with `non-scaling-stroke` instead of growing with the chart.
 */
export function DailyChartLines({ days, maximum }: DailyChartLinesProps): JSX.Element {
  return (
    <>
      {GRID_LINES.map((top) => (
        <div
          key={top}
          aria-hidden="true"
          className="bg-border absolute inset-x-0 h-px"
          style={{ top: `${top}%` }}
        />
      ))}
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        {SERIES.map((series) => (
          <polyline
            key={series.key}
            points={seriesPoints(days, series.key, maximum)}
            fill="none"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            className={SERIES_STROKES[series.key]}
          />
        ))}
      </svg>
    </>
  )
}
