import type { JSX } from 'react'

import { DELIVERY_COLUMN_VISIBILITY as COLUMNS } from '@/modules/webhooks/components/delivery-columns'
import { DeliveryStatusBadge } from '@/modules/webhooks/components/delivery-status-badge'
import { formatDuration } from '@/modules/webhooks/components/format-duration'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

type DeliveryRowProps = {
  delivery: DeliveryLogEntry
  /** When the log was loaded, to tell a retry that is already due from a future one. */
  loadedAt: number
  onOpen: () => void
}

/** One delivery as a row; the event (and the whole row) opens its full record. */
export function DeliveryRow({ delivery, loadedAt, onOpen }: DeliveryRowProps): JSX.Element {
  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell>
        <DeliveryStatusBadge status={delivery.status} />
      </TableCell>
      <TableCell>
        <button
          type="button"
          aria-haspopup="dialog"
          className="rounded-sm font-mono text-xs font-medium text-foreground hover:underline"
          onClick={(click) => {
            click.stopPropagation()
            onOpen()
          }}
        >
          {delivery.event_type}
        </button>
      </TableCell>
      <TableCell className={cn('text-muted-foreground', COLUMNS.response)}>
        <Response delivery={delivery} />
      </TableCell>
      <TableCell className={cn('text-end text-muted-foreground tabular-nums', COLUMNS.duration)}>
        <Duration ms={delivery.last_duration_ms ?? null} />
      </TableCell>
      <TableCell className={cn('text-end text-muted-foreground tabular-nums', COLUMNS.attempts)}>
        {delivery.attempts}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Timestamp value={delivery.created_at} format="relative" />
      </TableCell>
      <TableCell className={cn('text-muted-foreground', COLUMNS.next)}>
        <NextAttempt next={delivery.next_attempt_at ?? null} loadedAt={loadedAt} />
      </TableCell>
    </TableRow>
  )
}

/** The receiver's status code; without one, why the request failed, or nothing yet. */
function Response({ delivery }: { delivery: DeliveryLogEntry }): JSX.Element {
  const status = delivery.last_response_status
  const error = delivery.last_error ?? ''

  if (status !== null && status !== undefined) {
    return <code className={cn('font-mono text-xs', statusColor(status))}>HTTP {status}</code>
  }

  if (error !== '') {
    return (
      <span title={error} className="block max-w-48 truncate text-xs">
        {error}
      </span>
    )
  }

  return <span aria-label="Sem resposta">—</span>
}

/** 2xx in the success color, everything else in the error color. */
function statusColor(status: number): string {
  if (status >= 200 && status < 300) {
    return 'text-success'
  }

  return 'text-destructive'
}

function Duration({ ms }: { ms: number | null }): JSX.Element {
  if (ms === null) {
    return <span aria-label="Sem resposta">—</span>
  }

  return <>{formatDuration(ms)}</>
}

type NextAttemptProps = { next: string | null; loadedAt: number }

function NextAttempt({ next, loadedAt }: NextAttemptProps): JSX.Element {
  if (next === null) {
    return <span aria-label="Nenhuma">—</span>
  }

  if (Date.parse(next) <= loadedAt) {
    return <>Agora</>
  }

  return <Timestamp value={next} format="relative" />
}
