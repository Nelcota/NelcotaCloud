import type { JSX } from 'react'

import type { DeliverySummary } from '@/modules/webhooks/components/delivery-summary'
import { Timestamp } from '@/shared/ui/timestamp'

/** One quiet line under the headline: when the last delivery went out and the window's counts. */
export function DeliverySummaryLine({ summary }: { summary: DeliverySummary }): JSX.Element {
  const newest = summary.newest

  if (newest === null) {
    return (
      <p className="text-sm text-muted-foreground">Eventos de teste não entram no histórico.</p>
    )
  }

  const total = summary.delivered + summary.failed + summary.pending

  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      Última entrega <Timestamp value={newest.created_at} format="relative" />
      {` · ${summary.delivered} de ${total} recentes entregues`}
    </p>
  )
}
