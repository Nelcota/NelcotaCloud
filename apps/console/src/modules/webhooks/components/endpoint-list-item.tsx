import type { JSX } from 'react'

import { hostOf, pathOf } from '@/modules/webhooks/components/endpoint-host'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { endpointRowState } from '@/modules/webhooks/components/endpoint-row-state'
import { useLastDeliveryQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import { cn } from '@/shared/lib/utils'
import { StatusDot } from '@/shared/ui/status-dot'
import { Timestamp } from '@/shared/ui/timestamp'

type EndpointListItemProps = {
  projectId: string
  endpoint: WebhookEndpoint
  isSelected: boolean
  onSelect: () => void
}

/** One endpoint in the list: host in mono, then the newest delivery's state and when it went out. */
export function EndpointListItem(props: EndpointListItemProps): JSX.Element {
  const { endpoint, isSelected } = props
  const last = useLastDeliveryQuery(props.projectId, endpoint.id)
  const state = endpointRowState(endpoint.is_enabled, last.data)

  return (
    <li>
      <button
        type="button"
        aria-current={isSelected || undefined}
        title={endpoint.url}
        className={cn(
          'grid w-full min-w-0 gap-0.5 rounded-md px-2 py-1.5 text-start text-muted-foreground transition-[background-color,color,scale] duration-200 ease-standard hover:bg-surface hover:text-foreground',
          isSelected && 'bg-surface-hover text-foreground hover:bg-surface-hover',
        )}
        onClick={props.onSelect}
      >
        <span className="flex min-w-0 items-center gap-2">
          <StatusDot tone={state.tone} label={state.label} />
          <span className="truncate font-mono text-xs font-medium">{hostOf(endpoint.url)}</span>
        </span>
        <span className="truncate ps-4 font-mono text-2xs text-muted-foreground">
          {pathOf(endpoint.url)}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 ps-4 text-2xs text-muted-foreground">
          <span className="truncate">{state.label}</span>
          <LastAt value={state.lastAt} />
        </span>
      </button>
    </li>
  )
}

function LastAt({ value }: { value: string | null }): JSX.Element | null {
  if (value === null) {
    return null
  }

  return (
    <>
      <span aria-hidden>·</span>
      <Timestamp value={value} format="relative" />
    </>
  )
}
