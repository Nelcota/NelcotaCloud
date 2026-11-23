import { Plus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { isObjectName } from '@/modules/database/components/object-name'
import {
  BLANK_POLICY,
  type PolicyDraft,
  toPolicyRequest,
} from '@/modules/database/components/policy-draft'
import { PolicyFields } from '@/modules/database/components/policy-fields'
import { type PolicyTemplate, templatesFor } from '@/modules/database/components/policy-templates'
import { useCreatePolicyMutation } from '@/modules/database/queries/use-policy-mutations'
import type { components } from '@/shared/api/api-schema'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'

type TableOverview = components['schemas']['TableOverview']

type CreatePolicyDialogProps = { projectId: string; table: TableOverview }

/** Adds a policy, written by hand or started from a template that fits the table. */
export function CreatePolicyDialog({ projectId, table }: CreatePolicyDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<PolicyDraft>(BLANK_POLICY)
  const creation = useCreatePolicyMutation(projectId)

  function open(): void {
    setDraft(BLANK_POLICY)
    setIsOpen(true)
  }

  async function create(): Promise<void> {
    await creation.mutateAsync({ table: table.name, policy: toPolicyRequest(draft) })
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open}>
        <Plus aria-hidden data-icon="inline-start" />
        Nova política
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Nova política em ${table.name}`}
        size="lg"
        description="Libera um comando nas linhas que a condição aceita. Várias políticas se somam."
        confirmLabel="Criar política"
        missing={policyMissing(draft)}
        onConfirm={create}
      >
        <TemplatePicker templates={templatesFor(table)} onPick={setDraft} />
        <PolicyFields draft={draft} onChange={(change) => setDraft({ ...draft, ...change })} />
      </ConfirmDialog>
    </>
  )
}

type TemplatePickerProps = {
  templates: readonly PolicyTemplate[]
  onPick: (draft: PolicyDraft) => void
}

function TemplatePicker({ templates, onPick }: TemplatePickerProps): JSX.Element {
  return (
    <div role="group" aria-label="Modelos" className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Modelos</span>
      {templates.map((template) => (
        <Button
          key={template.label}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPick(template.draft)}
        >
          {template.label}
        </Button>
      ))}
    </div>
  )
}

function policyMissing(draft: PolicyDraft): string | null {
  if (isObjectName(draft.name) === false) {
    return 'Dê um nome válido à política'
  }

  if (draft.roles.length === 0) {
    return 'Escolha para quem vale'
  }

  return null
}
