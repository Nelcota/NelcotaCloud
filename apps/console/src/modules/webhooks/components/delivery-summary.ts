import type { components } from '@/shared/api/api-schema'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

const DAY_MS = 86_400_000

export type DeliverySummary = {
  delivered: number
  failed: number
  pending: number
  /** Failures created in the last 24 hours, within the loaded window. */
  failedLastDay: number
  /** The newest delivery, `null` when there is none. */
  newest: DeliveryLogEntry | null
}

/** Counts of the loaded deliveries (the API returns the newest 50). */
export function summarizeDeliveries(
  deliveries: readonly DeliveryLogEntry[],
  now: number,
): DeliverySummary {
  const failed = deliveries.filter((delivery) => delivery.status === 'failed')

  return {
    delivered: deliveries.filter((delivery) => delivery.status === 'delivered').length,
    failed: failed.length,
    pending: deliveries.filter((delivery) => delivery.status === 'pending').length,
    failedLastDay: failed.filter((delivery) => now - Date.parse(delivery.created_at) < DAY_MS)
      .length,
    newest: deliveries.at(0) ?? null,
  }
}
