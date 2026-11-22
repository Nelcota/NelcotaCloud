import type { JSX } from 'react'

import { DELIVERY_LABEL } from '@/modules/team/components/invitation-delivery-copy'
import type { components } from '@/shared/api/api-schema'
import { StatusBadge, type StatusTone } from '@/shared/ui/status-badge'

type DeliveryStatus = components['schemas']['InvitationDeliveryStatus']

/** A failed email stands out: it is the one the owner has to act on. */
const DELIVERY_TONE: Record<DeliveryStatus, StatusTone> = {
  unknown: 'neutral',
  sending: 'info',
  sent: 'success',
  failed: 'error',
}

export function InvitationDeliveryText({ status }: { status: DeliveryStatus }): JSX.Element {
  return <StatusBadge tone={DELIVERY_TONE[status]}>{DELIVERY_LABEL[status]}</StatusBadge>
}
