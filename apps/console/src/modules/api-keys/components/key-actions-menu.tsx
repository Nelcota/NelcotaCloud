import MenuDots from '~icons/solar/menu-dots-linear'
import Refresh from '~icons/solar/refresh-linear'
import TrashBin from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { KeyRevokeIllustration } from '@/modules/api-keys/components/key-illustrations'
import type { KeyRevocation } from '@/modules/api-keys/components/revoke-key-action'
import {
  canRevoke,
  keyLabel,
  revokeCopy,
  revokeMenuDetail,
} from '@/modules/api-keys/components/revoke-copy'
import { replaceCopy } from '@/modules/api-keys/components/replace-copy'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type KeyActionsMenuProps = {
  apiKey: ApiKeySummary
  revocation: KeyRevocation
  isReplacing: boolean
  onReplace: () => Promise<void>
}

type OpenDialog = 'replace' | 'revoke' | null

/**
 * The rarer actions of a key behind one button: replacing it (the safe way to rotate) and
 * revoking it. Both are confirmed first, since replacing creates a real key that a server key
 * shows only once.
 */
export function KeyActionsMenu(props: KeyActionsMenuProps): JSX.Element {
  const { apiKey, revocation } = props
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const revoke = revokeCopy(apiKey, revocation.activeOfKind)
  const replace = replaceCopy(apiKey)
  const isBusy = revocation.isPending || props.isReplacing

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isBusy}
          aria-busy={isBusy}
          aria-label={`Mais ações para ${keyLabel(apiKey)}`}
          render={<Button variant="ghost" size="icon-sm" className="shrink-0" />}
        >
          <MenuDots className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem onClick={() => setOpenDialog('replace')}>
            <Refresh />
            <ItemText title="Substituir" detail="Cria uma nova ao lado, para trocar sem parar" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <RevokeItem
            canRevoke={canRevoke(apiKey, revocation.activeOfKind)}
            detail={revokeMenuDetail(apiKey, revocation.activeOfKind)}
            onSelect={() => setOpenDialog('revoke')}
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        isOpen={openDialog === 'replace'}
        onOpenChange={(isOpen) => setOpenDialog(dialogAfter(isOpen, 'replace'))}
        title={replace.title}
        description={replace.description}
        confirmLabel="Criar substituta"
        onConfirm={props.onReplace}
      />
      <ConfirmDialog
        isOpen={openDialog === 'revoke'}
        onOpenChange={(isOpen) => setOpenDialog(dialogAfter(isOpen, 'revoke'))}
        title={revoke.title}
        description={revoke.description}
        confirmLabel="Revogar"
        change={revoke.change}
        illustration={<KeyRevokeIllustration kind={apiKey.kind} />}
        isDestructive
        onConfirm={revocation.onRevoke}
      />
    </>
  )
}

/** Which dialog stays open once one opens or closes. */
function dialogAfter(isOpen: boolean, dialog: OpenDialog): OpenDialog {
  if (isOpen) {
    return dialog
  }

  return null
}

type RevokeItemProps = { canRevoke: boolean; detail: string; onSelect: () => void }

/** Shown off rather than hidden for the last server key, with the reason and the way out. */
function RevokeItem({ canRevoke: isAllowed, detail, onSelect }: RevokeItemProps): JSX.Element {
  if (isAllowed === false) {
    return (
      <DropdownMenuItem disabled>
        <TrashBin />
        <ItemText title="Revogar" detail={detail} />
      </DropdownMenuItem>
    )
  }

  return (
    <DropdownMenuItem variant="destructive" onClick={onSelect}>
      <TrashBin />
      <ItemText title="Revogar" detail={detail} />
    </DropdownMenuItem>
  )
}

function ItemText({ title, detail }: { title: string; detail: string }): JSX.Element {
  return (
    <span className="grid">
      <span>{title}</span>
      <span className="text-muted-foreground text-xs">{detail}</span>
    </span>
  )
}
