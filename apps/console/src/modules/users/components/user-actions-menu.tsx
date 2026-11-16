import { Ban, LogOut, MoreHorizontal, ShieldOff, Trash2, UserCheck } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  CONFIRMATIONS,
  type ConfirmedAction,
} from '@/modules/users/components/user-action-confirmations'
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
  onAction: (action: UserAction) => void
}

/** Every admin action on a user behind one button, so rows stay one line high on any screen. */
export function UserActionsMenu({ user, isPending, onAction }: UserActionsMenuProps): JSX.Element {
  const [confirming, setConfirming] = useState<ConfirmedAction | null>(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          aria-busy={isPending}
          aria-label={`Ações para ${user.email}`}
          className="hover:bg-accent aria-expanded:bg-accent text-muted-foreground hover:text-foreground flex size-9 items-center justify-center rounded-md transition-colors"
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <BanItem
            isBanned={user.banned_at !== null && user.banned_at !== undefined}
            onUnban={() => onAction('unban')}
            onBan={() => setConfirming('ban')}
          />
          <DropdownMenuItem onClick={() => onAction('end-sessions')}>
            <LogOut strokeWidth={1.75} />
            Encerrar sessões
          </DropdownMenuItem>
          <ResetMfaItem isShown={user.mfa_enabled} onSelect={() => setConfirming('reset-mfa')} />
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming('delete')}>
            <Trash2 strokeWidth={1.75} />
            Excluir usuário
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ActionConfirmation
        action={confirming}
        email={user.email}
        onClose={() => setConfirming(null)}
        onConfirm={onAction}
      />
    </>
  )
}

type BanItemProps = { isBanned: boolean; onBan: () => void; onUnban: () => void }

function BanItem({ isBanned, onBan, onUnban }: BanItemProps): JSX.Element {
  if (isBanned) {
    return (
      <DropdownMenuItem onClick={onUnban}>
        <UserCheck strokeWidth={1.75} />
        Desbloquear
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem onClick={onBan}>
      <Ban strokeWidth={1.75} />
      Bloquear
    </DropdownMenuItem>
  )
}

function ResetMfaItem({
  isShown,
  onSelect,
}: {
  isShown: boolean
  onSelect: () => void
}): JSX.Element | null {
  if (isShown === false) {
    return null
  }

  return (
    <DropdownMenuItem onClick={onSelect}>
      <ShieldOff strokeWidth={1.75} />
      Remover MFA
    </DropdownMenuItem>
  )
}

type ActionConfirmationProps = {
  action: ConfirmedAction | null
  email: string
  onClose: () => void
  onConfirm: (action: UserAction) => void
}

function ActionConfirmation({
  action,
  email,
  onClose,
  onConfirm,
}: ActionConfirmationProps): JSX.Element | null {
  if (action === null) {
    return null
  }

  const confirmation = CONFIRMATIONS[action]

  return (
    <ConfirmDialog
      isOpen
      onOpenChange={(isOpen) => closeWhen(isOpen, onClose)}
      title={confirmation.title(email)}
      description={confirmation.description}
      confirmLabel={confirmation.confirmLabel}
      isDestructive={confirmation.isDestructive}
      onConfirm={() => onConfirm(action)}
    />
  )
}

function closeWhen(isOpen: boolean, onClose: () => void): void {
  if (isOpen) {
    return
  }

  onClose()
}
