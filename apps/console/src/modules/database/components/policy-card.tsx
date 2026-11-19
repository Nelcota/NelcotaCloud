import ShieldKeyhole from '~icons/solar/shield-keyhole-linear'
import type { JSX } from 'react'

import { commandLabel } from '@/modules/database/components/policy-draft'
import { useDropPolicyMutation } from '@/modules/database/queries/use-policy-mutations'
import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type PolicyOverview = components['schemas']['PolicyOverview']

type PolicyCardProps = { projectId: string; table: string; policy: PolicyOverview }

/** One policy: what it allows, to whom, on which rows; with the way to drop it. */
export function PolicyCard({ projectId, table, policy }: PolicyCardProps): JSX.Element {
  const drop = useDropPolicyMutation(projectId)

  return (
    <article className="surface grid gap-3 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="font-mono text-sm break-all">{policy.name}</h3>
          <Badge>{commandLabel(policy.command)}</Badge>
          <span className="text-muted-foreground font-mono text-xs">{policy.roles.join(', ')}</span>
        </span>
        <ConfirmButton
          title={`Excluir a política ${policy.name}?`}
          description="O que só ela liberava deixa de ser acessível pela API."
          confirmLabel="Excluir política"
          change={{ subject: policy.name, icon: ShieldKeyhole, from: 'Valendo', to: 'Excluída' }}
          isDestructive
          isPending={drop.isPending}
          onConfirm={() => drop.mutateAsync({ table, policy: policy.name })}
        >
          Excluir
        </ConfirmButton>
      </header>
      <Condition label="USING" condition={policy.using} />
      <Condition label="WITH CHECK" condition={policy.with_check} />
    </article>
  )
}

type ConditionProps = { label: string; condition?: string | null }

function Condition({ label, condition }: ConditionProps): JSX.Element | null {
  if (condition === null || condition === undefined) {
    return null
  }

  return (
    <div className="grid gap-1">
      <span className="text-muted-foreground text-xs">{label}</span>
      <code className="bg-muted/60 rounded-md border px-3 py-2 font-mono text-xs break-all whitespace-pre-wrap">
        {condition}
      </code>
    </div>
  )
}
