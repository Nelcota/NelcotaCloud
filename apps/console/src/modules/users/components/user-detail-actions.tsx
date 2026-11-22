import Ban from '~icons/solar/forbidden-circle-linear'
import Letter from '~icons/solar/letter-linear'
import UserCheck from '~icons/solar/user-check-linear'
import type { JSX } from 'react'

import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserActionsMenu } from '@/modules/users/components/user-actions-menu'
import { UserConfirmButton } from '@/modules/users/components/user-confirm-button'
import { isBanned, isVerified } from '@/modules/users/components/user-states'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { PendingButton } from '@/shared/ui/pending-button'

type User = components['schemas']['User']

type UserDetailActionsProps = { user: User; runner: UserActionRunner }

/** Shown as buttons (delete in the danger zone at the bottom); the menu keeps sessions and MFA. */
const BUTTON_ACTIONS: readonly UserAction[] = ['resend-verification', 'ban', 'unban', 'delete']

/** The header's actions: resend the confirmation, block or unblock, and every other one in `…`. */
export function UserDetailActions({ user, runner }: UserDetailActionsProps): JSX.Element {
  return (
    <>
      <ResendButton user={user} runner={runner} />
      <AccessButton user={user} runner={runner} />
      <UserActionsMenu
        user={user}
        isPending={runner.pendingAction !== null}
        excludedActions={BUTTON_ACTIONS}
        onAction={runner.run}
      />
    </>
  )
}

/** A blocked user gets no emails at all, so a resend would be refused. */
function ResendButton({ user, runner }: UserDetailActionsProps): JSX.Element | null {
  if (isVerified(user) || isBanned(user)) {
    return null
  }

  return (
    <PendingButton
      type="button"
      isPending={runner.pendingAction === 'resend-verification'}
      disabled={runner.pendingAction !== null}
      onClick={() => void runner.run('resend-verification').catch(shownAbove)}
    >
      <Letter aria-hidden data-icon="inline-start" />
      Reenviar confirmação
    </PendingButton>
  )
}

/** Blocking asks first; unblocking is safe and runs at once, its failure shown above the tabs. */
function AccessButton({ user, runner }: UserDetailActionsProps): JSX.Element {
  if (isBanned(user) === false) {
    return (
      <UserConfirmButton
        action="ban"
        label="Bloquear"
        icon={Ban}
        size="md"
        email={user.email}
        runner={runner}
      />
    )
  }

  return (
    <PendingButton
      type="button"
      variant="outline"
      isPending={runner.pendingAction === 'unban'}
      disabled={runner.pendingAction !== null}
      onClick={() => void runner.run('unban').catch(shownAbove)}
    >
      <UserCheck aria-hidden data-icon="inline-start" />
      Desbloquear
    </PendingButton>
  )
}

function shownAbove(): void {
  return undefined
}
