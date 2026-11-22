import type { JSX } from 'react'

import { DELIVERY_STATUS } from '@/modules/webhooks/components/delivery-status'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { cn } from '@/shared/lib/utils'
import type { StatusTone } from '@/shared/ui/status-badge'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

const BAR_COLORS: Partial<Record<StatusTone, string>> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-destructive',
}

type DeliveryStripProps = {
  /** Newest first, as the API returns them. */
  deliveries: readonly DeliveryLogEntry[]
  /** How many bars the strip always draws, so strips of different endpoints line up. */
  slots: number
  /** Bars share the full width instead of keeping a fixed thin width. */
  isStretched?: boolean
  className?: string
}

/**
 * One bar per recent delivery, oldest on the left, colored by its state: a run of failures
 * stands out at a glance. Unused slots stay as quiet bars.
 */
export function DeliveryStrip(props: DeliveryStripProps): JSX.Element {
  const { deliveries, slots, className } = props
  const bar = barShape(props.isStretched === true)
  const shown = deliveries.slice(0, slots).toReversed()
  const empty = Array.from({ length: slots - shown.length }, (_, index) => `empty-${index}`)

  return (
    <div
      role="img"
      aria-label={stripLabel(shown)}
      className={cn('flex h-5 items-stretch gap-0.5', className)}
    >
      {empty.map((key) => (
        <span key={key} className={cn(bar, 'bg-surface-hover')} />
      ))}
      {shown.map((delivery) => (
        <span
          key={delivery.id}
          title={`${DELIVERY_STATUS[delivery.status].label}: ${delivery.event_type}`}
          className={cn(bar, BAR_COLORS[DELIVERY_STATUS[delivery.status].tone])}
        />
      ))}
    </div>
  )
}

function barShape(isStretched: boolean): string {
  if (isStretched) {
    return 'min-w-0.5 flex-1 rounded-[2px]'
  }

  return 'w-1 shrink-0 rounded-[1px]'
}

function stripLabel(deliveries: readonly DeliveryLogEntry[]): string {
  if (deliveries.length === 0) {
    return 'Nenhuma entrega ainda'
  }

  const delivered = deliveries.filter((delivery) => delivery.status === 'delivered').length
  const total = formatCount(deliveries.length)

  return `${formatCount(delivered)} de ${total} entregas recentes aceitas`
}
