import type { JSX } from 'react'

import { addressesNeedingAction } from '@/modules/activity/components/addresses-needing-action'
import { FailingAddressNotice } from '@/modules/activity/components/failing-address-notice'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'

type ActivitySummaryProps = {
  projectId: string
  days: number
  onShowEvents: (address: string) => void
}

/** The one thing to act on: an address that keeps failing and is not blocked yet. */
export function ActivitySummary({
  projectId,
  days,
  onShowEvents,
}: ActivitySummaryProps): JSX.Element | null {
  const summary = useAuditSummaryQuery(projectId, days)
  const blocks = useBlockedAddressesQuery(projectId)
  const failing = summary.data?.failing_addresses ?? []
  const [first, ...others] = addressesNeedingAction(failing, blocks.data ?? [])

  if (first === undefined) {
    return null
  }

  return (
    <FailingAddressNotice
      projectId={projectId}
      alert={{ address: first, otherCount: others.length, days }}
      onShowEvents={onShowEvents}
    />
  )
}
