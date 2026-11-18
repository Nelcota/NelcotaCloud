import type { JSX } from 'react'

import {
  CONFIRMATIONS,
  type ConfirmedAction,
} from '@/modules/users/components/user-action-confirmations'
import { UserActionIllustration } from '@/modules/users/components/user-action-illustration'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ConfirmedActionButtonProps = {
  action: ConfirmedAction
  email: string
  isPending: boolean
  onConfirm: () => Promise<void>
}

/** A user action as a button, asking first with the same dialog the list's menu uses. */
export function ConfirmedActionButton(props: ConfirmedActionButtonProps): JSX.Element {
  const confirmation = CONFIRMATIONS[props.action]

  return (
    <ConfirmButton
      title={confirmation.title(props.email)}
      description={confirmation.description}
      confirmLabel={confirmation.confirmLabel}
      isDestructive={confirmation.isDestructive}
      change={confirmation.change(props.email)}
      illustration={<UserActionIllustration action={props.action} />}
      isPending={props.isPending}
      onConfirm={props.onConfirm}
    >
      {confirmation.confirmLabel}
    </ConfirmButton>
  )
}
