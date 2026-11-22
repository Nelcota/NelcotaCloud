import { useNavigate } from '@tanstack/react-router'
import type { JSX, MouseEvent } from 'react'

import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { DeliveryStrip } from '@/modules/webhooks/components/delivery-strip'
import { EndpointAddress } from '@/modules/webhooks/components/endpoint-address'
import { ENDPOINT_COLUMN_VISIBILITY as COLUMNS } from '@/modules/webhooks/components/endpoint-columns'
import { EndpointEventsCell } from '@/modules/webhooks/components/endpoint-events-cell'
import { HEALTH, healthKindOf } from '@/modules/webhooks/components/endpoint-health-state'
import type { WebhookEndpoint } from '@/modules/webhooks/components/endpoint-panel-types'
import { useRecentDeliveriesQuery } from '@/modules/webhooks/queries/use-webhook-deliveries'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** Enough bars to see a pattern in a row; the endpoint's page draws all 50. */
const ROW_STRIP_SLOTS = 24

type EndpointRowProps = { projectId: string; endpoint: WebhookEndpoint }

/** One endpoint: its address (the link to its page), its state, events and recent deliveries. */
export function EndpointRow({ projectId, endpoint }: EndpointRowProps): JSX.Element {
  const deliveries = useRecentDeliveriesQuery(projectId, endpoint.id)
  const navigate = useNavigate()
  const href = `/projects/${projectId}/webhooks/${endpoint.id}`

  // The link carries keyboard and screen reader access; the rest of the row is a shortcut.
  function openUnlessLink(click: MouseEvent<HTMLTableRowElement>): void {
    const target = click.target

    if (target instanceof Element && target.closest('a, button') !== null) {
      return
    }

    void navigate({ to: href })
  }

  return (
    <TableRow className="cursor-pointer" onClick={openUnlessLink}>
      <TableCell>
        <RouterLink
          href={href}
          title={endpoint.url}
          className="block max-w-44 min-w-0 rounded-sm text-sm hover:underline @min-[30rem]:max-w-72 @min-[48rem]:max-w-96"
        >
          <EndpointLabel endpoint={endpoint} />
        </RouterLink>
      </TableCell>
      <TableCell>
        <HealthBadge
          endpoint={endpoint}
          deliveries={deliveries.data}
          loadedAt={deliveries.dataUpdatedAt}
        />
      </TableCell>
      <TableCell className={COLUMNS.events}>
        <EndpointEventsCell eventTypes={endpoint.event_types} />
      </TableCell>
      <TableCell className={cn('text-end', COLUMNS.strip)}>
        <RecentDeliveries deliveries={deliveries.data} />
      </TableCell>
      <TableCell className={cn('text-end text-muted-foreground', COLUMNS.lastAt)}>
        <LastDelivery deliveries={deliveries.data} />
      </TableCell>
    </TableRow>
  )
}

/** The name above the address when the owner gave one; the address alone otherwise. */
function EndpointLabel({ endpoint }: { endpoint: WebhookEndpoint }): JSX.Element {
  const name = endpoint.description ?? ''

  if (name === '') {
    return <EndpointAddress url={endpoint.url} className="block truncate font-medium" />
  }

  return (
    <span className="grid gap-0.5">
      <span className="truncate font-medium text-foreground">{name}</span>
      <EndpointAddress url={endpoint.url} className="truncate text-xs" />
    </span>
  )
}

type HealthBadgeProps = {
  endpoint: WebhookEndpoint
  deliveries: readonly DeliveryLogEntry[] | undefined
  loadedAt: number
}

function HealthBadge({ endpoint, deliveries, loadedAt }: HealthBadgeProps): JSX.Element {
  if (deliveries === undefined) {
    return <Skeleton className="h-5 w-20 rounded-md" />
  }

  const health = HEALTH[healthKindOf(endpoint, summarizeDeliveries(deliveries, loadedAt))]

  return <StatusBadge tone={health.badgeTone}>{health.label}</StatusBadge>
}

type DeliveriesProps = { deliveries: readonly DeliveryLogEntry[] | undefined }

function RecentDeliveries({ deliveries }: DeliveriesProps): JSX.Element {
  if (deliveries === undefined) {
    return <Skeleton className="ms-auto h-5 w-32 rounded-sm" />
  }

  return <DeliveryStrip deliveries={deliveries} slots={ROW_STRIP_SLOTS} className="justify-end" />
}

function LastDelivery({ deliveries }: DeliveriesProps): JSX.Element | null {
  const newest = deliveries?.at(0)

  if (deliveries === undefined) {
    return null
  }

  if (newest === undefined) {
    return <>Nunca</>
  }

  return <Timestamp value={newest.created_at} format="relative" />
}
