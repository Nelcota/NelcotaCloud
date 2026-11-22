import type { components } from '@/shared/api/api-schema'

type DailyActivity = components['schemas']['DailyActivity']

/** The API keeps 90 days of activity, so a 90-day period has no earlier one to compare with. */
const KEPT_DAYS = 90

export type PeriodSeries = {
  /** The chosen period's days, oldest first; `undefined` while loading. */
  current: DailyActivity[] | undefined
  /** The same number of days just before it, or `null` when the API does not keep them. */
  previous: DailyActivity[] | null
}

/** How many days to ask for: the period and, when the API keeps them, the days before it. */
export function comparisonDays(days: number): number {
  return Math.min(days * 2, KEPT_DAYS)
}

/** Splits the fetched days into the period and the days before it. */
export function splitPeriods(fetched: DailyActivity[] | undefined, days: number): PeriodSeries {
  if (fetched === undefined) {
    return { current: undefined, previous: null }
  }

  const current = fetched.slice(-days)

  if (fetched.length < days * 2) {
    return { current, previous: null }
  }

  return { current, previous: fetched.slice(-days * 2, -days) }
}

export function totalOf(days: DailyActivity[], pick: (day: DailyActivity) => number): number {
  return days.reduce((total, day) => total + pick(day), 0)
}
