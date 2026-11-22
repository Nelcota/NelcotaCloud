import type { JSX } from 'react'

import { hostOf, pathOf } from '@/modules/webhooks/components/endpoint-host'
import { EndpointLastDelivery } from '@/modules/webhooks/components/endpoint-last-delivery'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { eventCountLabel } from '@/modules/webhooks/components/event-types'
import { cn } from '@/shared/lib/utils'
import { StatusBadge } from '@/shared/ui/status-badge'

type EndpointListItemProps = {
  projectId: string
  endpoint: WebhookEndpoint
  isSelected: boolean
  onSelect: () => void
}

/** One endpoint in the list: the newest delivery's dot, host, path, events and a paused mark. */
export function EndpointListItem(props: EndpointListItemProps): JSX.Element {
  const { endpoint, isSelected } = props

  return (
    <li>
      <button
        type="button"
        aria-current={isSelected || undefined}
        className={cn(
          'grid w-full min-w-0 gap-1 rounded-lg border border-transparent px-3 py-2.5 text-left transition-[background-color,transform] hover:bg-surface-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none active:scale-[0.99] motion-reduce:active:scale-100',
          isSelected && 'border-border bg-surface',
        )}
        onClick={props.onSelect}
      >
        <span className="flex min-w-0 items-center gap-2">
          <EndpointLastDelivery projectId={props.projectId} endpointId={endpoint.id} />
          <span className="truncate text-sm font-semibold">{hostOf(endpoint.url)}</span>
        </span>
        <span className="truncate ps-4 font-mono text-xs text-muted-foreground">
          {pathOf(endpoint.url)}
        </span>
        <span className="flex items-center gap-2 ps-4 text-xs text-muted-foreground">
          {eventCountLabel(endpoint.event_types.length)}
          <PausedMark isEnabled={endpoint.is_enabled} />
        </span>
      </button>
    </li>
  )
}

/** Only a paused endpoint is marked: receiving is the normal state. */
function PausedMark({ isEnabled }: { isEnabled: boolean }): JSX.Element | null {
  if (isEnabled) {
    return null
  }

  return <StatusBadge>Pausado</StatusBadge>
}
