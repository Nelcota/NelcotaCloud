import Ban from '~icons/solar/forbidden-circle-linear'
import Letter from '~icons/solar/letter-linear'
import LogOut from '~icons/solar/logout-2-linear'
import MoreHorizontal from '~icons/solar/menu-dots-linear'
import ShieldOff from '~icons/solar/shield-cross-linear'
import Trash2 from '~icons/solar/trash-bin-trash-linear'
import UserCheck from '~icons/solar/user-check-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  CONFIRMATIONS,
  type ConfirmedAction,
} from '@/modules/users/components/user-action-confirmations'
import { UserActionIllustration } from '@/modules/users/components/user-action-illustration'
import { accountStateOf, confirmationSubjectOf } from '@/modules/users/model/account-state'
import type { UserAction } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type User = components['schemas']['User']

type UserActionsMenuProps = {
  user: User
  isPending: boolean
  onAction: (action: UserAction) => Promise<void>
}

/**
 * Every admin action on a user behind one button, so rows stay one line high on any screen. It
 * follows the account's state like the user's page does; only "Encerrar sessões" is always
 * offered, since the list does not load each user's sessions (ending none changes nothing).
 */
export function UserActionsMenu({ user, isPending, onAction }: UserActionsMenuProps): JSX.Element {
  const [confirming, setConfirming] = useState<ConfirmedAction | null>(null)
  const state = accountStateOf(user)

  function runWithoutDialog(action: 'unban' | 'resend-verification'): void {
    void onAction(action).catch(ignoreShownError)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          aria-busy={isPending}
          aria-label={`Ações para ${user.email}`}
          className="hover:bg-accent aria-expanded:bg-accent text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-md transition-colors pointer-coarse:size-11"
        >
          <MoreHorizontal className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <ResendItem
            isShown={state === 'unverified'}
            onSelect={() => runWithoutDialog('resend-verification')}
          />
          <BanItem
            isBanned={state === 'banned'}
            onUnban={() => runWithoutDialog('unban')}
            onBan={() => setConfirming('ban')}
          />
          <DropdownMenuItem onClick={() => setConfirming('end-sessions')}>
            <LogOut />
            Encerrar sessões
          </DropdownMenuItem>
          <ResetMfaItem isShown={user.mfa_enabled} onSelect={() => setConfirming('reset-mfa')} />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming('delete')}>
            <Trash2 />
            Excluir usuário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionConfirmation
        action={confirming}
        user={user}
        onClose={() => setConfirming(null)}
        onConfirm={onAction}
      />
    </>
  )
}

type OptionalItemProps = { isShown: boolean; onSelect: () => void }

/** Only an unconfirmed, unblocked account can be sent the email again; a blocked one gets none. */
function ResendItem({ isShown, onSelect }: OptionalItemProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <DropdownMenuItem onClick={onSelect}>
      <Letter />
      Reenviar confirmação
    </DropdownMenuItem>
  )
}

type BanItemProps = { isBanned: boolean; onBan: () => void; onUnban: () => void }

function BanItem({ isBanned, onBan, onUnban }: BanItemProps): JSX.Element {
  if (isBanned) {
    return (
      <DropdownMenuItem onClick={onUnban}>
        <UserCheck />
        Desbloquear
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem variant="destructive" onClick={onBan}>
      <Ban />
      Bloquear
    </DropdownMenuItem>
  )
}

function ResetMfaItem({ isShown, onSelect }: OptionalItemProps): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <DropdownMenuItem onClick={onSelect}>
      <ShieldOff />
      Remover MFA
    </DropdownMenuItem>
  )
}

type ActionConfirmationProps = {
  action: ConfirmedAction | null
  user: User
  onClose: () => void
  onConfirm: (action: UserAction) => Promise<void>
}

function ActionConfirmation(props: ActionConfirmationProps): JSX.Element | null {
  const { action } = props

  if (action === null) {
    return null
  }

  const confirmation = CONFIRMATIONS[action]
  const subject = confirmationSubjectOf(props.user)

  return (
    <ConfirmDialog
      isOpen
      onClose={props.onClose}
      title={confirmation.title(subject)}
      description={confirmation.description(subject)}
      confirmLabel={confirmation.confirmLabel}
      isDestructive={confirmation.isDestructive}
      change={confirmation.change(subject)}
      illustration={<UserActionIllustration action={action} />}
      onConfirm={() => props.onConfirm(action)}
    />
  )
}

/** These run without a dialog; their failure is shown above the list, scrolled into view. */
function ignoreShownError(): void {
  return undefined
}
