import { Ellipsis, Trash2, KeyRound as Key } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { isLastSecret } from '@/modules/api-keys/components/key-activity'
import type { components } from '@/shared/api/api-schema'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { PendingButton } from '@/shared/ui/pending-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type ApiKeySummary = components['schemas']['ApiKeySummary']

const KIND_NAMES: Record<string, string> = {
  publishable: 'chave publicável',
  secret: 'chave secreta',
}

type RevokeKeyActionProps = {
  apiKey: ApiKeySummary
  /** Active keys of the same kind, this one included. */
  activeOfKind: number
  isPending: boolean
  onRevoke: () => Promise<void>
}

/**
 * The row's menu: revokes one key after naming it, and says what breaks when it is the last of
 * its kind. The last secret key cannot be revoked at all (the API refuses), so its item stays
 * disabled; the list says why below its rows.
 */
export function RevokeKeyAction(props: RevokeKeyActionProps): JSX.Element {
  const { apiKey, activeOfKind } = props
  const [isConfirming, setIsConfirming] = useState(false)
  const label = keyLabel(apiKey)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PendingButton
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={menuLabel(apiKey, label)}
            isPending={props.isPending}
          >
            <Ellipsis aria-hidden />
          </PendingButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            variant="destructive"
            disabled={isLastSecret(apiKey.kind, activeOfKind)}
            onSelect={() => setIsConfirming(true)}
          >
            <Trash2 aria-hidden />
            Revogar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={revokeTitle(apiKey)}
        description={revokeConsequence(apiKey.kind, activeOfKind)}
        confirmLabel="Revogar"
        change={{ subject: label, icon: Key, from: 'Ativa', to: 'Revogada' }}
        isDestructive
        onConfirm={props.onRevoke}
      />
    </>
  )
}

/** Names the key the way the table does, so the dialog cannot be mistaken for another row. */
function revokeTitle(apiKey: ApiKeySummary): string {
  const label = keyLabel(apiKey)

  if (apiKey.name === '') {
    return `Revogar a ${label}?`
  }

  return `Revogar “${apiKey.name}” (${label})?`
}

/** A named key is announced by its name, so two keys of one kind read apart. */
function menuLabel(apiKey: ApiKeySummary, label: string): string {
  if (apiKey.name === '') {
    return `Ações da ${label}`
  }

  return `Ações da chave ${apiKey.name} (${label})`
}

function keyLabel(apiKey: ApiKeySummary): string {
  return `${KIND_NAMES[apiKey.kind] ?? apiKey.kind} …${apiKey.hint}`
}

function revokeConsequence(kind: string, activeOfKind: number): string {
  if (kind === 'publishable' && activeOfKind <= 1) {
    return 'É a única chave publicável ativa: o app para de fazer login na hora, até você publicá-lo com uma chave nova.'
  }

  return 'Ela para de funcionar na hora. Apps e servidores que ainda a usam deixam de acessar a API.'
}
