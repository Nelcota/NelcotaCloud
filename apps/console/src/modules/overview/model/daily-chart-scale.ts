import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

export type SeriesKey = 'logins' | 'sign_ups'

/** A flat zero line still needs a scale; 4 keeps the ticks whole numbers. */
const MINIMUM_SCALE = 4
const NICE_STEPS = [1, 2, 5, 10]

/** The smallest 1, 2 or 5 × 10ⁿ at or above the busiest day, so the top tick is a round number. */
export function scaleMaximum(days: readonly DailyActivity[]): number {
  const busiest = Math.max(0, ...days.map((day) => Math.max(day.logins, day.sign_ups)))

  if (busiest <= MINIMUM_SCALE) {
    return MINIMUM_SCALE
  }

  const magnitude = 10 ** Math.floor(Math.log10(busiest))
  const step = NICE_STEPS.find((candidate) => candidate * magnitude >= busiest) ?? 10

  return step * magnitude
}

/** Points of one series in a 100 × 100 box (y grows downward), for an SVG polyline. */
export function seriesPoints(
  days: readonly DailyActivity[],
  key: SeriesKey,
  maximum: number,
): string {
  return days
    .map(
      (day, index) =>
        `${horizontalPercent(index, days.length)},${100 - (day[key] / maximum) * 100}`,
    )
    .join(' ')
}

/** Where a day sits across the plot, from 0 (first day) to 100 (last day). */
export function horizontalPercent(index: number, dayCount: number): number {
  if (dayCount <= 1) {
    return 50
  }

  return (index / (dayCount - 1)) * 100
}

/** The day nearest a pointer at `fraction` (0 to 1) of the plot width. */
export function nearestDay(fraction: number, dayCount: number): number {
  const clamped = Math.min(1, Math.max(0, fraction))

  return Math.round(clamped * (dayCount - 1))
}

export function seriesTotal(days: readonly DailyActivity[], key: SeriesKey): number {
  return days.reduce((total, day) => total + day[key], 0)
}
