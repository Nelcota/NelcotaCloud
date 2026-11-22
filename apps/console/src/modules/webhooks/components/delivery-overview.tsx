import type { JSX } from 'react'

import { summarizeDeliveries } from '@/modules/webhooks/components/delivery-summary'
import { DeliveryStrip } from '@/modules/webhooks/components/delivery-strip'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'
import { cn } from '@/shared/lib/utils'

type DeliveryLogEntry = components['schemas']['DeliveryLogEntry']

/** The API returns the newest 50 deliveries; the strip keeps a slot for each. */
const LOG_SLOTS = 50

type DeliveryOverviewProps = { deliveries: readonly DeliveryLogEntry[]; loadedAt: number }

/** The loaded window at a glance: one bar per delivery and how many ended in each state. */
export function DeliveryOverview({ deliveries, loadedAt }: DeliveryOverviewProps): JSX.Element {
  const summary = summarizeDeliveries(deliveries, loadedAt)
  const counts = [
    { label: 'Entregues', value: summary.delivered, color: 'bg-success' },
    { label: 'Pendentes', value: summary.pending, color: 'bg-warning' },
    { label: 'Falharam', value: summary.failed, color: 'bg-destructive' },
  ]

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground tabular-nums">
          Últimas {formatCount(deliveries.length)} entregas, da mais antiga à mais nova
        </p>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {counts.map((count) => (
            <li key={count.label} className="inline-flex items-center gap-1.5">
              <span aria-hidden className={cn('size-2 rounded-[2px]', count.color)} />
              <span className="text-muted-foreground">{count.label}</span>
              <span className="font-medium text-foreground tabular-nums">
                {formatCount(count.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <DeliveryStrip deliveries={deliveries} slots={LOG_SLOTS} isStretched className="h-8" />
    </div>
  )
}
