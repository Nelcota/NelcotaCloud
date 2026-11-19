import {
  type ActivityPeriod,
  type DayRange,
  type PresetDays,
  isDayRange,
  localDate,
} from '@/modules/activity/model/activity-period'

export const PRESET_LABELS: Record<PresetDays, string> = {
  1: 'Últimas 24 horas',
  7: 'Últimos 7 dias',
  30: 'Últimos 30 dias',
  90: 'Últimos 90 dias',
}

const PRESET_SHORT_LABELS: Record<PresetDays, string> = {
  1: '24 horas',
  7: '7 dias',
  30: '30 dias',
  90: '90 dias',
}

const DAY_MONTH = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

/** The period in full: "Últimos 7 dias", or the days picked, "12 – 18 de nov.". */
export function periodLabel(period: ActivityPeriod): string {
  if (isDayRange(period)) {
    return rangeLabel(period)
  }

  return PRESET_LABELS[period]
}

/** The period on a narrow button: "7 dias", or the days picked. */
export function periodShortLabel(period: ActivityPeriod): string {
  if (isDayRange(period)) {
    return rangeLabel(period)
  }

  return PRESET_SHORT_LABELS[period]
}

export function rangeLabel(range: DayRange): string {
  const from = localDate(range.from)

  if (range.from === range.to) {
    return DAY_MONTH.format(from)
  }

  return DAY_MONTH.formatRange(from, localDate(range.to))
}
