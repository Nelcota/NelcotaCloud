import type { JSX } from 'react'

import { DELIVERY_STATUS } from '@/modules/webhooks/components/delivery-status'
import { useLastDeliveryQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { StatusDot } from '@/shared/ui/status-dot'

type EndpointLastDeliveryProps = { projectId: string; endpointId: string }

/** A dot for the newest delivery, so a failing receiver stands out in the list. */
export function EndpointLastDelivery({
  projectId,
  endpointId,
}: EndpointLastDeliveryProps): JSX.Element {
  const last = useLastDeliveryQuery(projectId, endpointId)
  const delivery = last.data

  if (delivery === undefined || delivery === null) {
    return <StatusDot tone="neutral" label="Nenhuma entrega ainda" />
  }

  const status = DELIVERY_STATUS[delivery.status]

  return <StatusDot tone={status.tone} label={`Última entrega: ${status.label}`} />
}
