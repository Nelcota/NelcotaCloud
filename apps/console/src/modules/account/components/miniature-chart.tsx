import type { JSX } from 'react'

const LOGINS_PER_DAY = [18, 24, 21, 30, 27, 35, 32, 38, 29, 41, 44, 39, 47, 52]
const WIDTH = 280
const HEIGHT = 56
const BAR_GAP = 4

/** The login miniature's chart: a titled section with logins per day as bars of the main series. */
export function MiniatureChart(): JSX.Element {
  const highest = Math.max(...LOGINS_PER_DAY)
  const barWidth = WIDTH / LOGINS_PER_DAY.length - BAR_GAP

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface p-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="grid">
          <span className="text-2xs font-medium text-heading">Logins por dia</span>
          <span className="text-2xs text-muted-foreground">Contagem diária, 14 dias.</span>
        </div>
        <span className="rounded-[4px] bg-surface-hover px-1.5 py-0.5 font-mono text-2xs text-foreground">
          14d
        </span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-14 w-full" preserveAspectRatio="none">
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
              fill="var(--chart-1)"
            />
          )
        })}
      </svg>
    </div>
  )
}
