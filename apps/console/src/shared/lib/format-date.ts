const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const DATE_ONLY = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const UNKNOWN_DATE = '—'

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
