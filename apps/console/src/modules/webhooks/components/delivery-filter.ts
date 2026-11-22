import type { components } from '@/shared/api/api-schema'
import type { SegmentOption } from '@/shared/ui/segmented-control'

type DeliveryStatus = components['schemas']['DeliveryStatus']

export type DeliveryFilter = 'all' | DeliveryStatus

export const DELIVERY_FILTERS: readonly SegmentOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'failed', label: 'Falhas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'delivered', label: 'Entregues' },
]

/** What an empty filtered log says; deliveries are kept for 7 days. */
export const EMPTY_FILTER_TITLES: Record<DeliveryFilter, string> = {
  all: 'Nenhuma entrega nos últimos 7 dias',
  failed: 'Nenhuma falha nos últimos 7 dias',
  pending: 'Nada esperando nova tentativa',
  delivered: 'Nenhuma entrega aceita nos últimos 7 dias',
}

export function parseDeliveryFilter(value: string): DeliveryFilter {
  if (value === 'failed' || value === 'pending' || value === 'delivered') {
    return value
  }

  return 'all'
}

/** The state the API filters by; `null` for every state. */
export function statusOf(filter: DeliveryFilter): DeliveryStatus | null {
  if (filter === 'all') {
    return null
  }

  return filter
}
