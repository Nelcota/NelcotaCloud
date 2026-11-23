import type { ApiUsagePeriod } from '@/modules/database/api/read-api-usage'

const HOUR = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })

/** A traffic point's start: the hour for the last 24 hours, the UTC day otherwise. */
export function pointLabel(start: string, period: ApiUsagePeriod): string {
  const date = new Date(start)

  if (period === '24h') {
    return HOUR.format(date)
  }

  return DAY.format(date)
}
