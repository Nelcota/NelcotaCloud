import type { JSX } from 'react'

import { periodText } from '@/modules/activity/components/activity-filters'
import {
  ALERT_FAILURES,
  addressesNeedingAction,
  failuresText,
} from '@/modules/activity/components/addresses-needing-action'
import { FailingAddressNotice } from '@/modules/activity/components/failing-address-notice'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import type { components } from '@/shared/api/api-schema'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type ActivitySummaryProps = {
  projectId: string
  period: { summary: components['schemas']['AuditSummary'] | undefined; days: number }
  onShowEvents: (address: string) => void
}

/** The verdict on the period: the address to block when one keeps failing, or why all is calm. */
export function ActivitySummary({
  projectId,
  period,
  onShowEvents,
}: ActivitySummaryProps): JSX.Element | null {
  const blocks = useBlockedAddressesQuery(projectId)
  const summary = period.summary

  if (summary === undefined) {
    return null
  }

  const [first, ...others] = addressesNeedingAction(summary.failing_addresses, blocks.data ?? [])

  if (first !== undefined) {
    return (
      <FailingAddressNotice
        projectId={projectId}
        alert={{ address: first, otherCount: others.length, days: period.days }}
        onShowEvents={onShowEvents}
      />
    )
  }

  if (summary.failures === 0) {
    return (
      <SummarySentence tone="success" verdict="Saudável.">
        Nenhum login recusado {periodText(period.days)}.
      </SummarySentence>
    )
  }

  return (
    <SummarySentence tone="info" verdict="Sem alertas.">
      {failuresText(summary.failures)} {periodText(period.days)}, nenhum endereço com{' '}
      {ALERT_FAILURES} ou mais.
    </SummarySentence>
  )
}
