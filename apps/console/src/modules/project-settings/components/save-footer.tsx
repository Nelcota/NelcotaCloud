import type { JSX } from 'react'

import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'

type SaveFooterProps = {
  isSaved: boolean
  isPending: boolean
  hasChanges: boolean
}

/** The Save button of a settings group, enabled once something changed. */
export function SaveFooter({ isSaved, isPending, hasChanges }: SaveFooterProps): JSX.Element {
  return (
    <>
      <SavedNote isSaved={isSaved && hasChanges === false} message="Alterações salvas" />
      <PendingButton type="submit" size="sm" isPending={isPending} disabled={hasChanges === false}>
        Salvar
      </PendingButton>
    </>
  )
}
