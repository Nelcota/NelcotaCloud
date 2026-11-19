import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import { UserActionButton } from '@/modules/users/components/user-action-button'
import type { UserActionProps } from '@/modules/users/components/user-action-props'
import { accountStateOf, confirmationSubjectOf } from '@/modules/users/model/account-state'
import { useUserSessionsQuery } from '@/modules/users/queries/use-user-detail'

type UserHeaderActionsProps = UserActionProps & { projectId: string }

/**
 * The day-to-day actions on this user, in one place at the top: confirm the email, sign them out,
 * block or unblock. Each shows only when it applies; deleting stays at the page's end.
 */
export function UserHeaderActions(props: UserHeaderActionsProps): JSX.Element {
  return (
    <>
      <ResendButton {...props} />
      <EndSessionsButton {...props} />
      <AccessButton {...props} />
    </>
  )
}

/** A blocked user gets no emails at all, so a resend would be refused. */
function ResendButton(props: UserActionProps): JSX.Element | null {
  if (accountStateOf(props.user) !== 'unverified') {
    return null
  }

  return (
    <UserActionButton action="resend-verification" isPrimary {...props}>
      Reenviar confirmação
    </UserActionButton>
  )
}

/** Only offered while there is a session to end, and it says how many devices leave. */
function EndSessionsButton(props: UserHeaderActionsProps): JSX.Element | null {
  const { user } = props
  const sessions = useUserSessionsQuery({ projectId: props.projectId, userId: user.id }).data
  const sessionCount = sessions?.sessions.length ?? 0

  if (sessionCount === 0) {
    return null
  }

  return (
    <ConfirmedActionButton
      action="end-sessions"
      subject={{ ...confirmationSubjectOf(user), sessionCount }}
      isPending={props.pendingAction === 'end-sessions'}
      onConfirm={() => props.onAction('end-sessions')}
    />
  )
}

function AccessButton(props: UserActionProps): JSX.Element {
  const { user } = props

  if (accountStateOf(user) === 'banned') {
    return (
      <UserActionButton action="unban" isPrimary {...props}>
        Desbloquear
      </UserActionButton>
    )
  }

  return (
    <ConfirmedActionButton
      action="ban"
      subject={confirmationSubjectOf(user)}
      isPending={props.pendingAction === 'ban'}
      onConfirm={() => props.onAction('ban')}
    />
  )
}
