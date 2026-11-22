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

/** The secondary sidebar: every endpoint as a selectable row, under a label with the count. */
export function EndpointList(props: EndpointListProps): JSX.Element {
  const titleId = useId()

  return (
    <nav
      aria-labelledby={titleId}
      className="flex min-w-0 flex-col gap-1 rounded-xl bg-surface p-1.5 lg:sticky lg:top-0 lg:bg-transparent lg:p-0"
    >
      <div className="flex items-baseline justify-between gap-2 px-2 pb-1">
        <h2
          id={titleId}
          className="text-2xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          Endpoints
        </h2>
        <span className="font-mono text-2xs text-faint tabular-nums">
          {props.endpoints.length} de {props.limit}
        </span>
      </div>
      <ul className="flex flex-col gap-0.5">
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
    </nav>
  )
}
