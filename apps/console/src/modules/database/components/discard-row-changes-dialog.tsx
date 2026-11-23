import type { JSX } from 'react'

import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type DiscardRowChangesDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onDiscard: () => void
}

/** Asked when the row panel is dismissed with edits that were not saved. */
export function DiscardRowChangesDialog(props: DiscardRowChangesDialogProps): JSX.Element {
  return (
    <ConfirmDialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title="Descartar as alterações?"
      description="O que você mudou nesta linha ainda não foi salvo."
      confirmLabel="Descartar"
      cancelLabel="Continuar editando"
      isDestructive
      onConfirm={props.onDiscard}
    />
  )
}
