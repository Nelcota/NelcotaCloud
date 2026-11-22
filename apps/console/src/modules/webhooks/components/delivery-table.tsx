import { useState, type JSX, type ReactNode } from 'react'

import { DELIVERY_COLUMN_VISIBILITY as COLUMNS } from '@/modules/webhooks/components/delivery-columns'
import {
  type DeliveryFilter,
  EMPTY_FILTER_TITLES,
} from '@/modules/webhooks/components/delivery-filter'
import type { DeliveryRetry } from '@/modules/webhooks/components/delivery-retry'
import { DeliveryRow } from '@/modules/webhooks/components/delivery-row'
import { DeliverySheet } from '@/modules/webhooks/components/delivery-sheet'
import type { components } from '@/shared/api/api-schema'
import { cn } from '@/shared/lib/utils'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

export type DeliveryTableProps = {
  deliveries: readonly DeliveryLogEntry[]
  filter: DeliveryFilter
  retry: DeliveryRetry
  /** When the log was loaded (the query's update time). */
  loadedAt: number
  /** Under the rows: the button that reads older deliveries, when there are more. */
  footer?: ReactNode
}

/** The log as table rows; a row opens its full record in a sheet. */
export function DeliveryTable(props: DeliveryTableProps): JSX.Element {
  const { deliveries, filter, retry } = props
  const [openId, setOpenId] = useState<string | null>(null)

  if (deliveries.length === 0) {
    return <EmptyState title={EMPTY_FILTER_TITLES[filter]} isCompact isFramed />
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-card">
      <Table aria-label="Entregas">
        <TableHeader>
          <TableRow>
            <TableHead className="w-28">Situação</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead className={COLUMNS.response}>Resposta</TableHead>
            <TableHead className={cn('text-end', COLUMNS.duration)}>Tempo</TableHead>
            <TableHead className={cn('text-end', COLUMNS.attempts)}>Tentativas</TableHead>
            <TableHead>Criada</TableHead>
            <TableHead className={COLUMNS.next}>Próxima tentativa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <DeliveryRow
              key={delivery.id}
              delivery={delivery}
              loadedAt={props.loadedAt}
              onOpen={() => setOpenId(delivery.id)}
            />
          ))}
        </TableBody>
      </Table>
      {props.footer}
      <DeliverySheet
        delivery={deliveries.find((delivery) => delivery.id === openId)}
        retry={retry}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}
