import { RefreshCw as Refresh } from 'lucide-react'
import type { JSX } from 'react'

import { ROTATE_CHANGE, ROTATE_DESCRIPTION } from '@/modules/webhooks/components/endpoint-copy'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type RotateSecretButtonProps = {
  host: string
  /** False while another secret is on screen or being issued: one shown at a time. */
  canRotate: boolean
  isRotating: boolean
  onRotate: () => Promise<void>
}

/** Issues a new signing secret; the current one keeps signing for a day beside it. */
export function RotateSecretButton(props: RotateSecretButtonProps): JSX.Element {
  return (
    <ConfirmButton
      label="Gerar novo segredo"
      icon={Refresh}
      title={`Gerar um novo segredo para ${props.host}?`}
      description={ROTATE_DESCRIPTION}
      confirmLabel="Gerar segredo"
      change={ROTATE_CHANGE}
      isDisabled={props.canRotate === false}
      isPending={props.isRotating}
      onConfirm={props.onRotate}
    />
  )
}
