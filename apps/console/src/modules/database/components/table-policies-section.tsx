import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import type { JSX } from 'react'

import { CreatePolicyDialog } from '@/modules/database/components/create-policy-dialog'
import { PoliciesTable } from '@/modules/database/components/policies-table'
import { RowLevelSecuritySwitch } from '@/modules/database/components/row-level-security-switch'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'
import { Section } from '@/shared/ui/section'

type TableOverview = components['schemas']['TableOverview']

type TablePoliciesSectionProps = { projectId: string; table: TableOverview }

/** Row level security and the policies that open the table to the apps. */
export function TablePoliciesSection({ projectId, table }: TablePoliciesSectionProps): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <RowLevelSecuritySwitch projectId={projectId} table={table} />
      <Section
        title="Políticas"
        meta={table.policies.length}
        action={<CreatePolicyDialog projectId={projectId} table={table} />}
        isFramed
      >
        <PolicyList projectId={projectId} table={table} />
      </Section>
    </div>
  )
}

function PolicyList({ projectId, table }: TablePoliciesSectionProps): JSX.Element {
  if (table.policies.length === 0) {
    return (
      <EmptyState
        isCompact
        icon={<ShieldKeyhole aria-hidden />}
        title="Nenhuma política"
        description={emptyDescription(table.rls_enabled)}
      />
    )
  }

  return <PoliciesTable projectId={projectId} table={table.name} policies={table.policies} />
}

function emptyDescription(isRlsEnabled: boolean): string {
  if (isRlsEnabled) {
    return 'Sem políticas, os apps não alcançam nenhuma linha desta tabela.'
  }

  return 'Com row level security desligado, as políticas não valem.'
}
