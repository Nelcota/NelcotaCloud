import type { JSX, KeyboardEvent, PointerEvent } from 'react'
import { useState } from 'react'

import { DailyChartActiveDay } from '@/modules/overview/components/daily-chart-active-day'
import { DailyChartLines } from '@/modules/overview/components/daily-chart-lines'
import { DailyChartXAxis, DailyChartYAxis } from '@/modules/overview/components/daily-chart-axes'
import { nearestDay, scaleMaximum } from '@/modules/overview/model/daily-chart-scale'
import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 }

/** The plot with its axes; the pointer or the arrow keys pick the day the tooltip shows. */
export function DailyChartPlot({ days }: { days: readonly DailyActivity[] }): JSX.Element {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const maximum = scaleMaximum(days)
  const lastIndex = days.length - 1

  const followPointer = (event: PointerEvent<HTMLDivElement>): void => {
    const bounds = event.currentTarget.getBoundingClientRect()
    setActiveIndex(nearestDay((event.clientX - bounds.left) / bounds.width, days.length))
  }

  const moveWithKeys = (event: KeyboardEvent<HTMLDivElement>): void => {
    const step = KEY_STEPS[event.key]

    if (step === undefined) {
      return
    }

    event.preventDefault()
    setActiveIndex(Math.min(lastIndex, Math.max(0, (activeIndex ?? lastIndex) + step)))
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
      <DailyChartYAxis maximum={maximum} />
      <div
        role="group"
        tabIndex={0}
        aria-label="Logins e cadastros por dia. Use as setas para percorrer os dias."
        className="relative h-44 touch-pan-y rounded-sm"
        onPointerMove={followPointer}
        onPointerLeave={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(lastIndex)}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={moveWithKeys}
      >
        <DailyChartLines days={days} maximum={maximum} />
        <DailyChartActiveDay days={days} activeIndex={activeIndex} maximum={maximum} />
      </div>
      <span />
      <DailyChartXAxis days={days} />
    </div>
  )
}
