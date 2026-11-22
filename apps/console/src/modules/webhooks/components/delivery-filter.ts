import type { components } from '@/shared/api/api-schema'
import type { SegmentOption } from '@/shared/ui/segmented-control'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

export type DeliveryFilter = 'all' | 'failed' | 'pending'

export const DELIVERY_FILTERS: readonly SegmentOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'failed', label: 'Falhas' },
  { value: 'pending', label: 'Pendentes' },
]

/** What an empty filtered log says. */
export const EMPTY_FILTER_TITLES: Record<DeliveryFilter, string> = {
  all: 'Nenhuma entrega ainda',
  failed: 'Nenhuma falha nas últimas entregas',
  pending: 'Nada esperando nova tentativa',
}

export function parseDeliveryFilter(value: string): DeliveryFilter {
  if (value === 'failed' || value === 'pending') {
    return value
  }

  return 'all'
}

/** Filters the loaded rows; the API has no filter, so this covers the newest 50 only. */
export function filterDeliveries(
  deliveries: readonly DeliveryLogEntry[],
  filter: DeliveryFilter,
): DeliveryLogEntry[] {
  if (filter === 'all') {
    return [...deliveries]
  }

  return deliveries.filter((delivery) => delivery.status === filter)
}
