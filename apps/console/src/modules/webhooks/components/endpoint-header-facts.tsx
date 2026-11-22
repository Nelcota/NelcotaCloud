import type { JSX } from 'react'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { eventCountLabel } from '@/modules/webhooks/components/event-types'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

/** Under the host: the full URL to copy, how many events it takes and when it was created. */
export function EndpointHeaderFacts({ endpoint }: { endpoint: WebhookEndpoint }): JSX.Element {
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <IdChip label="URL do endpoint" value={endpoint.url} className="max-w-md" />
      <span className="tabular-nums">{eventCountLabel(endpoint.event_types.length)}</span>
      <span>
        Criado em <Timestamp value={endpoint.created_at} format="date" />
      </span>
    </div>
  )
}
