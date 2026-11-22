import type { AuditKind } from '@/modules/activity/api/list-audit-events'
import type { SegmentOption } from '@/shared/ui/segmented-control'

/** Every kind the API filters by, plus no filter at all. */
export type KindFilter = AuditKind | 'all'

/** What the project page shows first: a week is enough to spot a pattern without noise. */
export const DEFAULT_DAYS = 7

export const PERIOD_OPTIONS: readonly SegmentOption[] = [
  { label: '24h', value: '1' },
  { label: '7d', value: '7' },
  { label: '30d', value: '30' },
  { label: '90d', value: '90' },
]

const KIND_LABELS: Record<KindFilter, string> = {
  all: 'Tudo',
  logins: 'Logins',
  failures: 'Falhas',
  changes: 'Alterações',
  security: 'Segurança',
  account: 'Conta',
  project: 'Projeto',
}

export const KIND_OPTIONS: readonly SegmentOption[] = Object.entries(KIND_LABELS).map(
  ([value, label]) => ({ label, value }),
)

/** Narrows a value from the period control back to a number of days. */
export function parseDays(value: string): number | null {
  const option = PERIOD_OPTIONS.find((candidate) => candidate.value === value)

  if (option === undefined) {
    return null
  }

  return Number(option.value)
}

/** Narrows a value from the kind control back to a kind of event. */
export function parseKind(value: string): KindFilter | null {
  const kinds = Object.keys(KIND_LABELS)
  const kind = kinds.find((candidate): candidate is KindFilter => candidate === value)

  return kind ?? null
}

/** "nas últimas 24 horas", "nos últimos 7 dias". */
export function periodText(days: number): string {
  if (days === 1) {
    return 'nas últimas 24 horas'
  }

  return `nos últimos ${days} dias`
}
