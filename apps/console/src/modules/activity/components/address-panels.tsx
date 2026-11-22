import type { JSX } from 'react'

import { periodText } from '@/modules/activity/components/activity-filters'
import { BlockedAddressesTable } from '@/modules/activity/components/blocked-addresses-table'
import { FailingAddressesTable } from '@/modules/activity/components/failing-addresses-table'
import { useBlockedAddressesQuery } from '@/modules/activity/queries/use-blocked-addresses'
import { useAuditSummaryQuery } from '@/modules/overview/queries/use-audit-summary-query'
import { Section } from '@/shared/ui/section'

type AddressPanelsProps = {
  projectId: string
  days: number
  onShowEvents: (address: string) => void
}

/** The addresses refused most in the period, and the blocks in force. */
export function AddressPanels({ projectId, days, onShowEvents }: AddressPanelsProps): JSX.Element {
  const summary = useAuditSummaryQuery(projectId, days)
  const blocks = useBlockedAddressesQuery(projectId)

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Mais recusas"
        description={`Endereços que mais erraram email ou senha ${periodText(days)}.`}
        isFramed
      >
        <FailingAddressesTable
          projectId={projectId}
          addresses={summary.data?.failing_addresses ?? []}
          blocks={blocks.data ?? []}
          onShowEvents={onShowEvents}
        />
      </Section>
      <Section
        title="Bloqueados"
        description="Logins, cadastros e links por email desses endereços são recusados."
        isFramed
      >
        <BlockedAddressesTable projectId={projectId} />
      </Section>
    </div>
  )
}
