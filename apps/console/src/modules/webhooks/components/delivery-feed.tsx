import { useState, type JSX } from 'react'

import { DeliveryFeedItem } from '@/modules/webhooks/components/delivery-feed-item'
import {
  type DeliveryFilter,
  EMPTY_FILTER_TITLES,
} from '@/modules/webhooks/components/delivery-filter'
import type { DeliveryRetry } from '@/modules/webhooks/components/delivery-retry'
import { DeliverySheet } from '@/modules/webhooks/components/delivery-sheet'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

type DeliveryFeedProps = {
  deliveries: readonly DeliveryLogEntry[]
  filter: DeliveryFilter
  retry: DeliveryRetry
  /** When the log was loaded (the query's update time). */
  loadedAt: number
}

/** The log as an activity feed; an entry opens its full record in a sheet. */
export function DeliveryFeed(props: DeliveryFeedProps): JSX.Element {
  const { deliveries, filter, retry } = props
  const [openId, setOpenId] = useState<string | null>(null)

  if (deliveries.length === 0) {
    return <EmptyState title={EMPTY_FILTER_TITLES[filter]} isCompact isFramed />
  }

  return (
    <>
      <ul aria-label="Entregas" className="-mx-3 flex flex-col gap-0.5">
        {deliveries.map((delivery) => (
          <DeliveryFeedItem
            key={delivery.id}
            delivery={delivery}
            loadedAt={props.loadedAt}
            onOpen={() => setOpenId(delivery.id)}
          />
        ))}
      </ul>
      <DeliverySheet
        delivery={deliveries.find((delivery) => delivery.id === openId)}
        retry={retry}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
