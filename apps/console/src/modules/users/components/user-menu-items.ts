import Ban from '~icons/solar/forbidden-circle-linear'
import Letter from '~icons/solar/letter-linear'
import LogOut from '~icons/solar/logout-2-linear'
import ShieldOff from '~icons/solar/shield-cross-linear'
import Trash2 from '~icons/solar/trash-bin-trash-linear'
import UserCheck from '~icons/solar/user-check-linear'

import type { ConfirmedAction } from '@/modules/users/components/user-action-confirmations'
import { isBanned, isVerified } from '@/modules/users/components/user-states'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import type { IconComponent } from '@/shared/ui/icon-component'

type User = components['schemas']['User']

export type MenuHandlers = {
  /** Opens the confirmation of an action that needs one. */
  onConfirm: (action: ConfirmedAction) => void
  /** Runs an action safe enough to need no dialog. */
  onRun: (action: UserAction) => void
}

export type UserMenuItem = {
  action: UserAction
  label: string
  icon: IconComponent
  onSelect: () => void
  /** Destructive items come last, after a separator, in red. */
  isDestructive?: boolean
}

/** Every admin action on a user, in the order an admin reaches for them; delete stays last. */
export function userMenuItems(user: User, handlers: MenuHandlers): UserMenuItem[] {
  return [
    ...resendItems(user, handlers),
    accessItem(user, handlers),
    {
      action: 'end-sessions',
      label: 'Encerrar sessões',
      icon: LogOut,
      onSelect: () => handlers.onConfirm('end-sessions'),
    },
    ...mfaItems(user, handlers),
    {
      action: 'delete',
      label: 'Excluir usuário',
      icon: Trash2,
      isDestructive: true,
      onSelect: () => handlers.onConfirm('delete'),
    },
  ]
}

/** A blocked user gets no emails at all, so a resend would be refused. */
function resendItems(user: User, handlers: MenuHandlers): UserMenuItem[] {
  if (isVerified(user) || isBanned(user)) {
    return []
  }

  return [
    {
      action: 'resend-verification',
      label: 'Reenviar confirmação',
      icon: Letter,
      onSelect: () => handlers.onRun('resend-verification'),
    },
  ]
}

function accessItem(user: User, handlers: MenuHandlers): UserMenuItem {
  if (isBanned(user)) {
    return {
      action: 'unban',
      label: 'Desbloquear',
      icon: UserCheck,
      onSelect: () => handlers.onRun('unban'),
    }
  }

  return { action: 'ban', label: 'Bloquear', icon: Ban, onSelect: () => handlers.onConfirm('ban') }
}

function mfaItems(user: User, handlers: MenuHandlers): UserMenuItem[] {
  if (user.mfa_enabled === false) {
    return []
  }

  return [
    {
      action: 'reset-mfa',
      label: 'Remover MFA',
      icon: ShieldOff,
      onSelect: () => handlers.onConfirm('reset-mfa'),
    },
  ]
}
