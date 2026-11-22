import type { JSX } from 'react'

import {
  DELIVERY_FILTERS,
  type DeliveryFilter,
  parseDeliveryFilter,
} from '@/modules/webhooks/components/delivery-filter'
import { RetryFailedButton } from '@/modules/webhooks/components/retry-failed-button'
import { LiveIndicator } from '@/shared/ui/live-indicator'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type DeliveryLogToolbarProps = {
  projectId: string
  endpointId: string
  filter: { value: DeliveryFilter; onChange: (filter: DeliveryFilter) => void }
  /** Whether the filtered log shows any row. */
  hasRows: boolean
}

/** The state filter; on the failures, the button that sends them all again. */
export function DeliveryLogToolbar(props: DeliveryLogToolbarProps): JSX.Element {
  const { filter } = props

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <SegmentedControl
        label="Filtrar entregas"
        options={DELIVERY_FILTERS}
        value={filter.value}
        onValueChange={(value) => filter.onChange(parseDeliveryFilter(value))}
      />
      <div className="flex items-center gap-3">
        <FailuresAction {...props} />
        <LiveIndicator isLive />
      </div>
    </div>
  )
}

function FailuresAction(props: DeliveryLogToolbarProps): JSX.Element | null {
  if (props.filter.value !== 'failed' || props.hasRows === false) {
    return null
  }

  return <RetryFailedButton projectId={props.projectId} endpointId={props.endpointId} />
}
