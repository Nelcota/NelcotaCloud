import type { JSX } from 'react'

import { ConfirmButton } from '@/shared/ui/confirm-button'

type RemovePhotoButtonProps = {
  hasPhoto: boolean
  isPending: boolean
  onConfirm: () => Promise<void>
}

/** Only shown when there is a photo; the initials come back in its place. */
export function RemovePhotoButton(props: RemovePhotoButtonProps): JSX.Element | null {
  if (props.hasPhoto === false) {
    return null
  }

  return (
    <ConfirmButton
      label="Remover"
      title="Remover foto de perfil?"
      description="Suas iniciais voltam a aparecer no lugar da foto."
      confirmLabel="Remover"
      isDestructive
      isPending={props.isPending}
      onConfirm={props.onConfirm}
    />
  )
}
