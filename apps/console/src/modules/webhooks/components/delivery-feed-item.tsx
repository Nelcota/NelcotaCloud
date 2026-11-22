import type { JSX, ReactNode } from 'react'

import { DeliveryStatusBadge } from '@/modules/webhooks/components/delivery-status-badge'
import type { components } from '@/shared/api/api-schema'
import { ActivityItem } from '@/shared/ui/activity-item'
import { Timestamp } from '@/shared/ui/timestamp'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** Enough of the id to tell deliveries apart at a glance; the sheet shows and copies it whole. */
const SHORT_ID_LENGTH = 8

type DeliveryFeedItemProps = {
  delivery: DeliveryLogEntry
  /** When the log was loaded, to tell a retry that is already due from a future one. */
  loadedAt: number
  onOpen: () => void
}

/** One delivery: the event in front, attempt, response, id and time below, the status aside. */
export function DeliveryFeedItem({
  delivery,
  loadedAt,
  onOpen,
}: DeliveryFeedItemProps): JSX.Element {
  return (
    <li>
      <ActivityItem
        title={<span className="font-mono">{delivery.event_type}</span>}
        meta={metaOf(delivery, loadedAt)}
        status={<DeliveryStatusBadge status={delivery.status} />}
        onOpen={onOpen}
      />
    </li>
  )
}

function metaOf(delivery: DeliveryLogEntry, loadedAt: number): ReactNode[] {
  const facts: ReactNode[] = [attemptLabel(delivery.attempts)]
  const status = delivery.last_response_status

  if (status !== null && status !== undefined) {
    facts.push(<span className="font-mono tabular-nums">HTTP {status}</span>)
  }

  facts.push(<span className="font-mono">{delivery.id.slice(0, SHORT_ID_LENGTH)}</span>)
  facts.push(<Timestamp value={delivery.created_at} format="relative" />)

  const next = delivery.next_attempt_at

  if (next !== null && next !== undefined) {
    facts.push(<NextAttempt next={next} loadedAt={loadedAt} />)
  }

  return facts
}

function attemptLabel(attempts: number): string {
  if (attempts < 1) {
    return 'na fila'
  }

  return `tentativa ${attempts}`
}

type NextAttemptProps = { next: string; loadedAt: number }

/** A delivery waiting for a retry says when it goes out again. */
function NextAttempt({ next, loadedAt }: NextAttemptProps): JSX.Element {
  if (Date.parse(next) <= loadedAt) {
    return <span>próxima agora</span>
  }

  return (
    <span>
      próxima <Timestamp value={next} format="relative" />
    </span>
  )
}
