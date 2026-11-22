import { useState, type JSX } from 'react'

import {
  type DeliveryFilter,
  EMPTY_FILTER_TITLES,
} from '@/modules/webhooks/components/delivery-filter'
import type { DeliveryRetry } from '@/modules/webhooks/components/delivery-retry'
import { DeliverySheet } from '@/modules/webhooks/components/delivery-sheet'
import { DeliveryTableRow } from '@/modules/webhooks/components/delivery-table-row'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

const COLUMNS = ['Status', 'Evento', 'HTTP', 'Tentativas', 'Próxima / última', 'ID', 'Hora']

type DeliveryTableProps = {
  deliveries: readonly DeliveryLogEntry[]
  filter: DeliveryFilter
  retry: DeliveryRetry
  /** When the log was loaded (the query's update time). */
  loadedAt: number
}

/** The log as a table; a row opens its full record in a sheet. */
export function DeliveryTable(props: DeliveryTableProps): JSX.Element {
  const { deliveries, filter, retry } = props
  const [openId, setOpenId] = useState<string | null>(null)

  if (deliveries.length === 0) {
    return (
      <div className="px-5 pb-5 sm:px-6">
        <EmptyState title={EMPTY_FILTER_TITLES[filter]} isCompact />
      </div>
    )
  }

  return (
    <>
      <div className="border-t">
        <Table className="[&_td]:px-3 [&_td:first-child]:ps-5 [&_th]:px-3 [&_th:first-child]:ps-5 sm:[&_td:first-child]:ps-6 sm:[&_th:first-child]:ps-6">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <DeliveryTableRow
                key={delivery.id}
                delivery={delivery}
                loadedAt={props.loadedAt}
                onOpen={() => setOpenId(delivery.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <DeliverySheet
        delivery={deliveries.find((delivery) => delivery.id === openId)}
        retry={retry}
        onClose={() => setOpenId(null)}
      />
    </>
  )
}
