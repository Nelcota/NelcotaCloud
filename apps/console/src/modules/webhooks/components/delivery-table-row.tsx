import type { JSX } from 'react'

import { DeliveryStatusBadge } from '@/modules/webhooks/components/delivery-status-badge'
import { DeliveryTime } from '@/modules/webhooks/components/delivery-time'
import type { components } from '@/shared/api/api-schema'
import { IdChip } from '@/shared/ui/id-chip'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

type DeliveryTableRowProps = {
  delivery: DeliveryLogEntry
  /** When the log was loaded, to tell a retry that is already due from a future one. */
  loadedAt: number
  onOpen: () => void
}

/** One delivery; the event name opens its details, and so does a click anywhere on the row. */
export function DeliveryTableRow({
  delivery,
  loadedAt,
  onOpen,
}: DeliveryTableRowProps): JSX.Element {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell>
        <DeliveryStatusBadge status={delivery.status} />
      </TableCell>
      <TableCell>
        <button
          type="button"
          className="rounded-sm font-mono text-sm text-foreground underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`Detalhes da entrega ${delivery.event_type}`}
          onClick={(event) => {
            event.stopPropagation()
            onOpen()
          }}
        >
          {delivery.event_type}
        </button>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground tabular-nums">
        {responseCode(delivery.last_response_status)}
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{delivery.attempts}</TableCell>
      <TableCell className="text-muted-foreground">
        <AttemptTime delivery={delivery} loadedAt={loadedAt} />
      </TableCell>
      <TableCell onClick={(event) => event.stopPropagation()}>
        <IdChip label="ID da entrega" value={delivery.id} className="max-w-22" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <DeliveryTime value={delivery.created_at} />
      </TableCell>
    </TableRow>
  )
}

/** A pending delivery tells when it retries; any other, when it was last tried. */
function AttemptTime({
  delivery,
  loadedAt,
}: {
  delivery: DeliveryLogEntry
  loadedAt: number
}): JSX.Element {
  const next = delivery.next_attempt_at
  const last = delivery.last_attempt_at

  if (next !== null && next !== undefined && Date.parse(next) <= loadedAt) {
    return <span>próxima agora</span>
  }

  if (next !== null && next !== undefined) {
    return (
      <span>
        próxima <Timestamp value={next} format="relative" />
      </span>
    )
  }

  if (last === null || last === undefined) {
    return <span>—</span>
  }

  return <Timestamp value={last} format="relative" />
}

function responseCode(status: number | null | undefined): string {
  if (status === null || status === undefined) {
    return '—'
  }

  return String(status)
}
