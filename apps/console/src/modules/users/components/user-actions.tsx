import type { JSX } from 'react'

import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type User = components['schemas']['User']

type UserActionsProps = {
  user: User
  isPending: boolean
  onAction: (action: UserAction) => void
}

export function UserActions({ user, isPending, onAction }: UserActionsProps): JSX.Element {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <BanToggle user={user} isPending={isPending} onAction={onAction} />
      <Button
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => onAction('end-sessions')}
      >
        Encerrar sessões
      </Button>
      <ResetMfa user={user} isPending={isPending} onAction={onAction} />
      <ConfirmButton
        title={`Excluir ${user.email}?`}
        description="Remove o usuário, suas identidades e sessões. Não dá para desfazer."
        confirmLabel="Excluir"
        isDestructive
        isPending={isPending}
        onConfirm={() => onAction('delete')}
      >
        Excluir
      </ConfirmButton>
    </div>
  )
}

function BanToggle({ user, isPending, onAction }: UserActionsProps): JSX.Element {
  if (user.banned_at !== null && user.banned_at !== undefined) {
    return (
      <Button variant="outline" size="sm" disabled={isPending} onClick={() => onAction('unban')}>
        Desbloquear
      </Button>
    )
  }

  return (
    <ConfirmButton
      title={`Bloquear ${user.email}?`}
      description="O usuário não consegue mais entrar e todas as sessões terminam."
      confirmLabel="Bloquear"
      isDestructive
      isPending={isPending}
      onConfirm={() => onAction('ban')}
    >
      Bloquear
    </ConfirmButton>
  )
}

function ResetMfa({ user, isPending, onAction }: UserActionsProps): JSX.Element | null {
  if (user.mfa_enabled === false) {
    return null
  }

  return (
    <ConfirmButton
      title="Remover o autenticador?"
      description="Use quando o usuário perdeu o celular e você já confirmou quem ele é."
      confirmLabel="Remover MFA"
      isPending={isPending}
      onConfirm={() => onAction('reset-mfa')}
    >
      Remover MFA
    </ConfirmButton>
  )
}
