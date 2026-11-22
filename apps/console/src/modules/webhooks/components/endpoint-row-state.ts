import { DELIVERY_STATUS } from '@/modules/webhooks/components/delivery-status'
import type { components } from '@/shared/api/api-schema'
import type { StatusTone } from '@/shared/ui/status-badge'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

export type EndpointRowState = {
  tone: StatusTone
  label: string
  /** When the newest delivery was created, `null` when there is none. */
  lastAt: string | null
}

/** What one row of the endpoint list says: paused, no deliveries, or the newest delivery's state. */
export function endpointRowState(
  isEnabled: boolean,
  last: DeliveryLogEntry | null | undefined,
): EndpointRowState {
  const lastAt = last?.created_at ?? null

  if (isEnabled === false) {
    return { tone: 'neutral', label: 'Pausado', lastAt }
  }

  if (last === null || last === undefined) {
    return { tone: 'neutral', label: 'Sem entregas', lastAt }
  }

  const status = DELIVERY_STATUS[last.status]

  return { tone: status.tone, label: status.label, lastAt }
}
