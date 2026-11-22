import type { JSX } from 'react'

import { ROTATE_CHANGE, ROTATE_DESCRIPTION } from '@/modules/webhooks/components/endpoint-copy'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type RotateSecretDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  host: string
  onRotate: () => Promise<void>
}

/** Asks before issuing a new signing secret; the current one keeps signing for a day. */
export function RotateSecretDialog(props: RotateSecretDialogProps): JSX.Element {
  return (
    <ConfirmDialog
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title={`Gerar um novo segredo para ${props.host}?`}
      description={ROTATE_DESCRIPTION}
      confirmLabel="Gerar segredo"
      change={ROTATE_CHANGE}
      onConfirm={props.onRotate}
    />
  )
}
