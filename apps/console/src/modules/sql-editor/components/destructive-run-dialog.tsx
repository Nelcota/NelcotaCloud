import type { JSX } from 'react'

import type { PendingRun } from '@/modules/sql-editor/components/use-sql-editor'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type DestructiveRunDialogProps = {
  pendingRun: PendingRun | null
  onConfirm: () => void
  onCancel: () => void
}

/** Asks before a query that erases data runs: the editor bypasses RLS and cannot undo it. */
export function DestructiveRunDialog(props: DestructiveRunDialogProps): JSX.Element {
  const { pendingRun, onConfirm, onCancel } = props
  const statements = pendingRun?.statements.join(', ') ?? ''

  return (
    <ConfirmDialog
      isOpen={pendingRun !== null}
      onOpenChange={(isOpen) => {
        if (isOpen === false) {
          onCancel()
        }
      }}
      title="Rodar uma consulta que apaga dados?"
      description={`A consulta tem ${statements}. O editor ignora as políticas e não dá para desfazer.`}
      confirmLabel="Rodar mesmo assim"
      isDestructive
      onConfirm={onConfirm}
    />
  )
}
