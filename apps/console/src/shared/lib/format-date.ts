const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const DATE_ONLY = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const TIME_ONLY = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' })
const TIME_WITH_SECONDS = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'medium' })
const DAY_AND_MONTH = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' })
const FULL_DAY = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' })
const UNKNOWN_DATE = '—'
const DAY_IN_MILLISECONDS = 86_400_000
const RELATIVE = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' })
/** Each unit is used while the age is below the next unit's size, in seconds. */
const RELATIVE_UNITS: readonly { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: 'second', seconds: 1 },
  { unit: 'minute', seconds: 60 },
  { unit: 'hour', seconds: 3_600 },
  { unit: 'day', seconds: 86_400 },
  { unit: 'month', seconds: 2_592_000 },
  { unit: 'year', seconds: 31_536_000 },
]

/** `Intl` throws on invalid dates; a bad value shows a dash instead of breaking the page. */
export function formatDateTime(isoDate: string): string {
  return formatWith(DATE_TIME, isoDate)
}

export function formatDate(isoDate: string): string {
  return formatWith(DATE_ONLY, isoDate)
}

function formatWith(format: Intl.DateTimeFormat, isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_DATE
  }

  return format.format(date)
}

export function formatTime(isoDate: string): string {
  return formatWith(TIME_ONLY, isoDate)
}

/** With seconds, to tell apart events within the same minute. */
export function formatPreciseTime(isoDate: string): string {
  return formatWith(TIME_WITH_SECONDS, isoDate)
}

/** The day a moment falls on, as a heading: "Hoje", "Ontem", "3 de março", or with the year. */
export function formatDayLabel(isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_DATE
  }

  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY_IN_MILLISECONDS)

  if (daysAgo === 0) {
    return 'Hoje'
  }

  if (daysAgo === 1) {
    return 'Ontem'
  }

  if (date.getFullYear() === new Date().getFullYear()) {
    return DAY_AND_MONTH.format(date)
  }

  return FULL_DAY.format(date)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** How long ago a moment was ("há 3 dias", "há 4 meses"), for spotting old items at a glance. */
export function formatRelative(isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN_DATE
  }

  const secondsAgo = (date.getTime() - Date.now()) / 1_000
  const size = Math.abs(secondsAgo)
  const unit =
    RELATIVE_UNITS.findLast((candidate) => size >= candidate.seconds) ?? RELATIVE_UNITS[0]

  if (unit === undefined || unit.unit === 'second') {
    return 'agora'
  }

  return RELATIVE.format(Math.round(secondsAgo / unit.seconds), unit.unit)
}
