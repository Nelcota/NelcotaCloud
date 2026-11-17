import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'

type DeliveryStatus = components['schemas']['DeliveryStatus']

const STATUS_BADGES: Record<
  DeliveryStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  delivered: { label: 'Entregue', variant: 'success' },
  pending: { label: 'Tentando de novo', variant: 'warning' },
  failed: { label: 'Falhou', variant: 'destructive' },
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }): JSX.Element {
  const badge = STATUS_BADGES[status]

  return <Badge variant={badge.variant}>{badge.label}</Badge>
}
