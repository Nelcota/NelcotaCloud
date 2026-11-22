import type { JSX } from 'react'

import { DELIVERY_STATUS } from '@/modules/webhooks/components/delivery-status'
import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type DeliveryStatus = components['schemas']['DeliveryStatus']

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }): JSX.Element {
  const badge = DELIVERY_STATUS[status]

  return <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
}
