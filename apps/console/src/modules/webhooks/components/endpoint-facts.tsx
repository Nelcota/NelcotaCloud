import type { JSX } from 'react'

import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { EVENT_TYPES } from '@/modules/webhooks/components/event-types'
import { IdChip } from '@/shared/ui/id-chip'
import { Timestamp } from '@/shared/ui/timestamp'

/** The endpoint's id, creation date and subscribed events by their wire names. */
export function EndpointFacts({ endpoint }: { endpoint: WebhookEndpoint }): JSX.Element {
  const subscribed = EVENT_TYPES.filter((eventType) => endpoint.event_types.includes(eventType))

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
      <IdChip label="ID do endpoint" value={endpoint.id} isLabelVisible className="max-w-72" />
      <span>
        Criado em <Timestamp value={endpoint.created_at} format="date" />
      </span>
      <ul aria-label="Eventos assinados" className="flex flex-wrap gap-1.5">
        {subscribed.map((eventType) => (
          <li
            key={eventType}
            className="rounded-md border bg-surface px-1.5 py-0.5 font-mono text-xs text-foreground"
          >
            {eventType}
          </li>
        ))}
      </ul>
    </div>
  )
}
