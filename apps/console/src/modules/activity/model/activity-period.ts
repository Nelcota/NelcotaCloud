/** A preset count of days back from now. */
export type PresetDays = 1 | 7 | 30 | 90

/** Local calendar days, both included, as `YYYY-MM-DD`. */
export type DayRange = { from: string; to: string }

/** What stretch of the log the page reads: a preset, or days picked on the calendar. */
export type ActivityPeriod = PresetDays | DayRange

/** The period fields of the API's activity queries. */
export type PeriodQuery = { days?: number; from?: string; to?: string }

export const PRESETS: readonly PresetDays[] = [1, 7, 30, 90]

/** A week answers "anything unusual lately?" without an empty page on a quiet project. */
export const DEFAULT_PERIOD: PresetDays = 7

/** The log keeps 90 days, so a range covers at most those and today. */
export const RETENTION_DAYS = 90
const MAX_RANGE_DAYS = RETENTION_DAYS + 1

const DAY_MILLISECONDS = 86_400_000
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function isDayRange(period: ActivityPeriod): period is DayRange {
  return typeof period === 'object'
}

/** A range as the API reads it: local midnight of the first day up to the one after the last. */
export function periodQuery(period: ActivityPeriod): PeriodQuery {
  if (isDayRange(period) === false) {
    return { days: period }
  }

  const from = localDate(period.from)
  const to = localDate(period.to)
  to.setDate(to.getDate() + 1)

  return { from: from.toISOString(), to: to.toISOString() }
}

/** A stable text for query keys: `7`, or `2026-11-12/2026-11-18`. */
export function periodKey(period: ActivityPeriod): string {
  if (isDayRange(period)) {
    return `${period.from}/${period.to}`
  }

  return String(period)
}

/** A valid range from untrusted text: real days, in order, no longer than the log. */
export function dayRangeOf(from: unknown, to: unknown): DayRange | undefined {
  const first = validDay(from)
  const last = validDay(to)

  if (first === undefined || last === undefined) {
    return undefined
  }

  const span = daysBetween(first, last)

  if (span < 0 || span >= MAX_RANGE_DAYS) {
    return undefined
  }

  return { from: first, to: last }
}

/** `YYYY-MM-DD` of a local date. */
export function dayOf(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** Local midnight of a `YYYY-MM-DD` day already checked by {@link dayRangeOf}. */
export function localDate(day: string): Date {
  const [year, month, date] = day.split('-').map(Number)

  return new Date(year ?? 0, (month ?? 1) - 1, date ?? 1)
}

function validDay(text: unknown): string | undefined {
  if (typeof text !== 'string') {
    return undefined
  }

  const match = DAY_PATTERN.exec(text)

  if (match === null) {
    return undefined
  }

  // February 30 rolls over to March; a real day reads back the same.
  if (dayOf(localDate(text)) !== text) {
    return undefined
  }

  return text
}

/** Whole days from one day to another, free of daylight-saving shifts. */
function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to) - utcMidnight(from)) / DAY_MILLISECONDS)
}

function utcMidnight(day: string): number {
  const date = localDate(day)

  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}
