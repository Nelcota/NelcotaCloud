import type { JSX } from 'react'

import {
  CONFIRMATIONS,
  type ConfirmedAction,
} from '@/modules/users/components/user-action-confirmations'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import type { IconComponent } from '@/shared/ui/icon-component'

type UserConfirmButtonProps = {
  action: ConfirmedAction
  label: string
  email: string
  runner: UserActionRunner
  icon?: IconComponent
  size?: 'sm' | 'md'
}

/** A button for an action that asks first, with the same question the list's menu asks. */
export function UserConfirmButton(props: UserConfirmButtonProps): JSX.Element {
  const { action, email, runner } = props
  const confirmation = CONFIRMATIONS[action]

  return (
    <ConfirmButton
      label={props.label}
      icon={props.icon}
      size={props.size}
      title={confirmation.title(email)}
      description={confirmation.description}
      confirmLabel={confirmation.confirmLabel}
      isDestructive={confirmation.isDestructive}
      change={confirmation.change(email)}
      isPending={runner.pendingAction === action}
      isDisabled={runner.pendingAction !== null}
      onConfirm={() => runner.run(action)}
    />
  )
}
