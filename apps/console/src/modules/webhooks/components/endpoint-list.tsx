import { useId, type JSX } from 'react'

import { EndpointListItem } from '@/modules/webhooks/components/endpoint-list-item'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'

type EndpointListProps = {
  projectId: string
  endpoints: readonly WebhookEndpoint[]
  selectedId: string | null
  onSelect: (endpointId: string) => void
  /** How many endpoints the project may have. */
  limit: number
}

/** The master column: every endpoint as a selectable row, with the count against the limit. */
export function EndpointList(props: EndpointListProps): JSX.Element {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card lg:sticky lg:top-0"
    >
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 id={titleId} className="text-sm font-semibold">
            Endpoints
          </h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {props.endpoints.length} de {props.limit}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1 p-1.5">
        {props.endpoints.map((endpoint) => (
          <EndpointListItem
            key={endpoint.id}
            projectId={props.projectId}
            endpoint={endpoint}
            isSelected={endpoint.id === props.selectedId}
            onSelect={() => props.onSelect(endpoint.id)}
          />
        ))}
      </ul>
    </section>
  )
}
