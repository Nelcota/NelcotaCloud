import type { SeriesKey } from '@/modules/overview/model/daily-chart-scale'

/** The API sends UTC days; formatting them in UTC keeps a day from sliding to the one before. */
const SHORT_DAY = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export const SERIES: readonly { key: SeriesKey; label: string; colorClass: string }[] = [
  { key: 'logins', label: 'Logins', colorClass: 'bg-chart-1' },
  { key: 'sign_ups', label: 'Cadastros', colorClass: 'bg-chart-2' },
]

export const SERIES_STROKES: Record<SeriesKey, string> = {
  logins: 'stroke-chart-1',
  sign_ups: 'stroke-chart-2',
}

/** "18 de nov." from "2026-11-18"; a malformed date shows as it came. */
export function shortDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime())) {
    return date
  }

  return SHORT_DAY.format(parsed)
}

export function formatCount(count: number): string {
  return count.toLocaleString('pt-BR')
}
