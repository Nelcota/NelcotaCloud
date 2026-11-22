const DAY_PARTS = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const LONG_DAY = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** "8 set": a UTC day (`YYYY-MM-DD`) short enough for an axis label. */
export function shortDay(date: string): string {
  const parsed = parseDay(date)

  if (parsed === null) {
    return date
  }

  const parts = DAY_PARTS.formatToParts(parsed)
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''

  return `${day} ${month.replace('.', '')}`
}

/** "8 de set. de 2026", for the tooltip. */
export function longDay(date: string): string {
  const parsed = parseDay(date)

  if (parsed === null) {
    return date
  }

  return LONG_DAY.format(parsed)
}

function parseDay(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}
