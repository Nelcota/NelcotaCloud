import Key from '~icons/solar/key-linear'
import TrashBin from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type RevokeKeyActionProps = {
  apiKey: ApiKeySummary
  /** Active keys of the same kind, this one included. */
  activeOfKind: number
  isPending: boolean
  onRevoke: () => void
}

/**
 * Revokes one key after naming it, and says what breaks when it is the last of its kind.
 * The last secret key cannot be revoked at all (the API refuses), so it is never offered.
 */
export function RevokeKeyAction(props: RevokeKeyActionProps): JSX.Element | null {
  const { apiKey, activeOfKind } = props

  if (apiKey.kind === 'secret' && activeOfKind <= 1) {
    return (
      <span className="text-muted-foreground text-sm whitespace-normal">Única secret ativa</span>
    )
  }

  return (
    <ConfirmButton
      title={revokeTitle(apiKey)}
      description={revokeConsequence(apiKey.kind, activeOfKind)}
      confirmLabel="Revogar"
      change={{ subject: keyLabel(apiKey), icon: Key, from: 'Ativa', to: 'Revogada' }}
      isDestructive
      isPending={props.isPending}
      triggerLabel={`Revogar ${keyLabel(apiKey)}`}
      onConfirm={props.onRevoke}
    >
      <TrashBin aria-hidden="true" className="size-4" />
      <span className="hidden sm:inline">Revogar</span>
    </ConfirmButton>
  )
}

/** Names the key the way the list does, so the dialog cannot be mistaken for another row. */
function revokeTitle(apiKey: ApiKeySummary): string {
  const label = `${apiKey.kind} key …${apiKey.hint}`

  if (apiKey.name === '') {
    return `Revogar a ${label}?`
  }

  return `Revogar “${apiKey.name}” (${label})?`
}

function keyLabel(apiKey: ApiKeySummary): string {
  return `${apiKey.kind} …${apiKey.hint}`
}

function revokeConsequence(kind: string, activeOfKind: number): string {
  if (kind === 'publishable' && activeOfKind <= 1) {
    return 'É a única publishable key ativa: o app para de fazer login na hora, até você publicá-lo com uma chave nova.'
  }

  return 'Ela para de funcionar na hora. Apps e servidores que ainda a usam deixam de acessar a API.'
}
