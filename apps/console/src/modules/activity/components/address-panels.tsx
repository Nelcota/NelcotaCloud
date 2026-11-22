import type { JSX } from 'react'

import { BlockedAddressesTable } from '@/modules/activity/components/blocked-addresses-table'
import { CollapsiblePanel } from '@/modules/activity/components/collapsible-panel'
import { FailingAddressesTable } from '@/modules/activity/components/failing-addresses-table'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'

type AddressPanelsProps = {
  projectId: string
  days: number
  onShowEvents: (address: string) => void
}

/** The bottom of the page: the addresses refused most in the period, and the blocks in force. */
export function AddressPanels({ projectId, days, onShowEvents }: AddressPanelsProps): JSX.Element {
  const summary = useAuditSummaryQuery(projectId, days)
  const blocks = useBlockedAddressesQuery(projectId)
  const failing = summary.data?.failing_addresses

  return (
    <div className="flex flex-col gap-3">
      <CollapsiblePanel title="Endereços com mais recusas" count={failing?.length}>
        <FailingAddressesTable
          projectId={projectId}
          addresses={failing ?? []}
          blocks={blocks.data ?? []}
          onShowEvents={onShowEvents}
        />
      </CollapsiblePanel>
      <CollapsiblePanel title="Endereços bloqueados" count={blocks.data?.length}>
        <BlockedAddressesTable projectId={projectId} />
      </CollapsiblePanel>
    </div>
  )
}
