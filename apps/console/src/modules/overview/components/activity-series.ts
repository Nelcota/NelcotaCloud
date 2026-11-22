import type { components } from '@/shared/api/api-schema'

export type DailyActivity = components['schemas']['DailyActivity']

/** The two lines of the chart: color token, field it reads, and a dash so they differ without hue. */
export const ACTIVITY_SERIES = [
  { id: 'logins', label: 'Logins', color: 'text-chart-1', dot: 'bg-chart-1', dash: undefined },
  { id: 'sign_ups', label: 'Cadastros', color: 'text-chart-2', dot: 'bg-chart-2', dash: '4 3' },
] as const

export type ActivitySeries = (typeof ACTIVITY_SERIES)[number]

export function valuesOf(days: DailyActivity[], series: ActivitySeries): number[] {
  return days.map((day) => day[series.id])
}
