import type { JSX } from 'react'

import { deliveryClock, fullDeliveryDate } from '@/modules/webhooks/components/delivery-dates'

/** The hour to the second; the full date shows on hover. */
export function DeliveryTime({ value }: { value: string }): JSX.Element {
  return (
    <time className="tabular-nums" dateTime={value} title={fullDeliveryDate(value)}>
      {deliveryClock(value)}
    </time>
  )
}
