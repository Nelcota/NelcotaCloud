import type { components } from '@/shared/api/api-schema'
import type { StatusTone } from '@/shared/ui/status-badge'

type DeliveryStatus = components['schemas']['DeliveryStatus']

/** How each delivery state reads, in the log's badges and the list's dots. */
export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: StatusTone }> = {
  delivered: { label: 'Entregue', tone: 'success' },
  pending: { label: 'Pendente', tone: 'warning' },
  failed: { label: 'Falhou', tone: 'error' },
}
