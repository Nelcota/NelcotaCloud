import type { JSX } from 'react'

const LOGINS_PER_DAY = [18, 24, 21, 30, 27, 35, 32, 38, 29, 41, 44, 39, 47, 52]
const WIDTH = 280
const HEIGHT = 64
const BAR_GAP = 4

/** The login miniature's chart: logins per day as bars, the latest day in orange over neutral bars. */
export function MiniatureChart(): JSX.Element {
  const highest = Math.max(...LOGINS_PER_DAY)
  const barWidth = WIDTH / LOGINS_PER_DAY.length - BAR_GAP
  const lastIndex = LOGINS_PER_DAY.length - 1

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-2">
      <span className="text-xs text-muted-foreground">Logins por dia</span>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-16 w-full" preserveAspectRatio="none">
        {LOGINS_PER_DAY.map((logins, index) => {
          const barHeight = (logins / highest) * HEIGHT

          return (
            <rect
              key={index}
              x={index * (barWidth + BAR_GAP)}
              y={HEIGHT - barHeight}
              width={barWidth}
              height={barHeight}
              rx="1.5"
              fill={barColor(index === lastIndex)}
            />
          )
        })}
      </svg>
    </div>
  )
}

function barColor(isLatest: boolean): string {
  if (isLatest) {
    return 'var(--primary)'
  }

  return 'color-mix(in oklab, var(--foreground) 16%, transparent)'
}
