import type { JSX } from 'react'

import type { UserActionProps } from '@/modules/users/components/user-action-props'
import type { UserAction } from '@/modules/users/queries/use-users'
import { Button } from '@/shared/ui/button'

type UserActionButtonProps = UserActionProps & {
  action: Extract<UserAction, 'unban' | 'resend-verification'>
  children: string
  /** The page's next natural step (resend, unblock) leads; elsewhere it stays outline. */
  isPrimary?: boolean
}

/** An action safe enough to run without a dialog; its failure shows above the sections. */
export function UserActionButton(props: UserActionButtonProps): JSX.Element {
  const { action, pendingAction, onAction, children } = props
  const isPending = pendingAction === action

  return (
    <Button
      variant={buttonVariant(props.isPrimary)}
      size="sm"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => void onAction(action).catch(shownAbove)}
    >
      {children}
    </Button>
  )
}

function shownAbove(): void {
  return undefined
}

function buttonVariant(isPrimary: boolean | undefined): 'default' | 'outline' {
  if (isPrimary === true) {
    return 'default'
  }

  return 'outline'
}
