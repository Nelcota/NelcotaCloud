import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import type { JSX } from 'react'

import { CreatePolicyDialog } from '@/modules/database/components/create-policy-dialog'
import { PolicyCard } from '@/modules/database/components/policy-card'
import { RowLevelSecuritySwitch } from '@/modules/database/components/row-level-security-switch'
import type { components } from '@/shared/api/api-schema'
import { EmptyState } from '@/shared/ui/empty-state'

type TableOverview = components['schemas']['TableOverview']

type TablePoliciesSectionProps = { projectId: string; table: TableOverview }

/** Row level security and the policies that open the table to the apps. */
export function TablePoliciesSection({ projectId, table }: TablePoliciesSectionProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <RowLevelSecuritySwitch projectId={projectId} table={table} />
      <div className="flex items-center justify-between gap-3">
        <h2>Políticas</h2>
        <CreatePolicyDialog projectId={projectId} table={table} />
      </div>
      <PolicyList projectId={projectId} table={table} />
    </div>
  )
}

function PolicyList({ projectId, table }: TablePoliciesSectionProps): JSX.Element {
  if (table.policies.length === 0) {
    return (
      <EmptyState
        icon={ShieldKeyhole}
        title="Nenhuma política"
        description={emptyDescription(table.rls_enabled)}
      />
    )
  }

  return (
    <div className="grid gap-3">
      {table.policies.map((policy) => (
        <PolicyCard key={policy.name} projectId={projectId} table={table.name} policy={policy} />
      ))}
    </div>
  )
}

function emptyDescription(isRlsEnabled: boolean): string {
  if (isRlsEnabled) {
    return 'Sem políticas, os apps não alcançam nenhuma linha desta tabela.'
  }

  return 'Com row level security desligado, as políticas não valem.'
}
