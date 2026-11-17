import type { JSX } from 'react'

import { ConfirmedActionButton } from '@/modules/users/components/confirmed-action-button'
import { DetailRow } from '@/modules/users/components/detail-row'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'
import { SettingsSection } from '@/shared/ui/settings-section'

type User = components['schemas']['User']

export type UserActionProps = {
  user: User
  /** The action running on this user, if any. */
  pendingAction: UserAction | null
  onAction: (action: UserAction) => Promise<void>
}

/** The account's email, access and MFA states, each with the action that changes it. */
export function UserAccountSection(props: UserActionProps): JSX.Element {
  return (
    <SettingsSection title="Conta">
      <dl className="divide-y">
        <EmailRow {...props} />
        <AccessRow {...props} />
        <MfaRow {...props} />
      </dl>
    </SettingsSection>
  )
}

function EmailRow(props: UserActionProps): JSX.Element {
  const { user } = props
  const verifiedAt = user.email_verified_at

  if (verifiedAt !== null && verifiedAt !== undefined) {
    return <DetailRow label="Email">Confirmado em {formatDateTime(verifiedAt)}</DetailRow>
  }

  // A blocked user gets no emails at all, so a resend would be refused.
  if (user.banned_at !== null && user.banned_at !== undefined) {
    return <DetailRow label="Email">Não confirmado</DetailRow>
  }

  const resend = (
    <ActionButton action="resend-verification" {...props}>
      Reenviar confirmação
    </ActionButton>
  )

  return (
    <DetailRow label="Email" action={resend}>
      Não confirmado
    </DetailRow>
  )
}

function AccessRow(props: UserActionProps): JSX.Element {
  const { user, pendingAction, onAction } = props
  const bannedAt = user.banned_at

  if (bannedAt !== null && bannedAt !== undefined) {
    const unban = (
      <ActionButton action="unban" {...props}>
        Desbloquear
      </ActionButton>
    )

    return (
      <DetailRow label="Acesso" action={unban}>
        Bloqueado em {formatDateTime(bannedAt)}
      </DetailRow>
    )
  }

  const ban = (
    <ConfirmedActionButton
      action="ban"
      email={user.email}
      isPending={pendingAction === 'ban'}
      onConfirm={() => onAction('ban')}
    />
  )

  return (
    <DetailRow label="Acesso" action={ban}>
      Ativo
    </DetailRow>
  )
}

function MfaRow({ user, pendingAction, onAction }: UserActionProps): JSX.Element {
  if (user.mfa_enabled === false) {
    return <DetailRow label="MFA">Desativado</DetailRow>
  }

  const reset = (
    <ConfirmedActionButton
      action="reset-mfa"
      email={user.email}
      isPending={pendingAction === 'reset-mfa'}
      onConfirm={() => onAction('reset-mfa')}
    />
  )

  return (
    <DetailRow label="MFA" action={reset}>
      Autenticador ativado
    </DetailRow>
  )
}

type ActionButtonProps = UserActionProps & { action: UserAction; children: string }

/** An action safe enough to run without a dialog; its failure shows above the sections. */
function ActionButton(props: ActionButtonProps): JSX.Element {
  const { action, pendingAction, onAction, children } = props
  const isPending = pendingAction === action

  return (
    <Button
      variant="outline"
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
