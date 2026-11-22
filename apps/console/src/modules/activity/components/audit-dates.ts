const TIME = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
const WEEKDAY_DATE = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})
const WEEKDAY_DATE_YEAR = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const UNKNOWN = '—'
const DAY_MS = 86_400_000

/** "14:03:27,481": the exact millisecond, the way log lines read under their day. */
export function logClockTime(isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN
  }

  const milliseconds = String(date.getMilliseconds()).padStart(3, '0')

  return `${TIME.format(date)},${milliseconds}`
}

/** The local calendar day of an instant, to group events by the day the reader lives in. */
export function dayKey(isoDate: string): string {
  const date = new Date(isoDate)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN
  }

  return localDay(date)
}

/** "Hoje", "Ontem" or "seg., 18 de nov." (with the year when it is not this year). */
export function dayLabel(key: string, now: Date): string {
  const date = new Date(`${key}T12:00:00`)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN
  }

  if (key === localDay(now)) {
    return 'Hoje'
  }

  if (key === localDay(new Date(now.getTime() - DAY_MS))) {
    return 'Ontem'
  }

  if (date.getFullYear() === now.getFullYear()) {
    return WEEKDAY_DATE.format(date)
  }

  return WEEKDAY_DATE_YEAR.format(date)
}

function localDay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}
