import { Plus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  type ColumnDraft,
  type ReferenceTarget,
  blankColumnDraft,
  isDraftComplete,
  toColumnDefinition,
} from '@/modules/database/components/column-draft'
import { ColumnDraftFields } from '@/modules/database/components/column-draft-fields'
import { useAddColumnMutation } from '@/modules/database/queries/use-column-mutations'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'

type AddColumnDialogProps = {
  projectId: string
  table: string
  targets: readonly ReferenceTarget[]
}

/** Adds one column to an existing table; its rows get the default, or null. */
export function AddColumnDialog({ projectId, table, targets }: AddColumnDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState<ColumnDraft>(blankColumnDraft)
  const addition = useAddColumnMutation(projectId)

  function open(): void {
    setDraft(blankColumnDraft())
    setIsOpen(true)
  }

  async function add(): Promise<void> {
    await addition.mutateAsync({ table, column: toColumnDefinition(draft) })
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open}>
        <Plus aria-hidden data-icon="inline-start" />
        Adicionar coluna
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Nova coluna em ${table}`}
        description="As linhas que já existem recebem o valor padrão, ou nulo."
        confirmLabel="Adicionar coluna"
        canConfirm={isDraftComplete(draft)}
        size="lg"
        onConfirm={add}
      >
        <ColumnDraftFields
          draft={draft}
          targets={targets}
          canBePrimaryKey={false}
          onChange={setDraft}
        />
      </ConfirmDialog>
    </>
  )
}
