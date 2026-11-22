const CLOCK = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})
const FULL = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeStyle: 'medium' })
const UNKNOWN = '—'

/** The hour to the second, which tells retries apart in the log. */
export function deliveryClock(value: string): string {
  return formatWith(CLOCK, value)
}

/** The full date and hour, for tooltips and the opened row. */
export function fullDeliveryDate(value: string): string {
  return formatWith(FULL, value)
}

function formatWith(format: Intl.DateTimeFormat, value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return UNKNOWN
  }

  return format.format(date)
}
