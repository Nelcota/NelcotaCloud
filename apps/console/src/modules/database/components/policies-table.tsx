import type { JSX } from 'react'

import { DropPolicyButton } from '@/modules/database/components/drop-policy-button'
import { commandLabel } from '@/modules/database/components/policy-draft'
import type { components } from '@/shared/api/api-schema'
import { CodeBlock } from '@/shared/ui/code-block'
import { StatusBadge } from '@/shared/ui/status-badge'

type PolicyOverview = components['schemas']['PolicyOverview']

type PoliciesTableProps = { projectId: string; table: string; policies: PolicyOverview[] }

/** One row per policy: what it allows, to whom, on which rows; with the way to drop it. */
export function PoliciesTable({ projectId, table, policies }: PoliciesTableProps): JSX.Element {
  return (
    <ul aria-label="Políticas da tabela" className="divide-y">
      {policies.map((policy) => (
        <li key={policy.name} className="flex flex-col gap-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium wrap-anywhere">{policy.name}</span>
              <StatusBadge tone="info">{commandLabel(policy.command)}</StatusBadge>
              <span className="sr-only">Para</span>
              {policy.roles.map((role) => (
                <StatusBadge key={role}>{role}</StatusBadge>
              ))}
            </div>
            <DropPolicyButton projectId={projectId} table={table} policy={policy.name} />
          </div>
          <Condition label="USING" condition={policy.using} />
          <Condition label="WITH CHECK" condition={policy.with_check} />
        </li>
      ))}
    </ul>
  )
}

type ConditionProps = { label: string; condition?: string | null }

function Condition({ label, condition }: ConditionProps): JSX.Element | null {
  if (condition === null || condition === undefined) {
    return null
  }

  return <CodeBlock code={condition} title={label} copyLabel={`condição ${label}`} isWrapped />
}
