import TrashBin from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import { KeyRevokeIllustration } from '@/modules/api-keys/components/key-illustrations'
import { keyLabel, revokeCopy } from '@/modules/api-keys/components/revoke-copy'
import type { components } from '@/shared/api/api-schema'
import { ConfirmButton } from '@/shared/ui/confirm-button'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type KeyRevocation = {
  /** Active keys of the same kind, this one included. */
  activeOfKind: number
  isPending: boolean
  onRevoke: () => Promise<void>
}

type RevokeKeyActionProps = KeyRevocation & { apiKey: ApiKeySummary }

/**
 * Revoke as a visible button, for the one moment it is the next step: an old key whose
 * replacement was just created. Elsewhere revoking sits in the row's menu.
 */
export function RevokeKeyAction(props: RevokeKeyActionProps): JSX.Element {
  const { apiKey } = props
  const copy = revokeCopy(apiKey, props.activeOfKind)

  return (
    <ConfirmButton
      title={copy.title}
      description={copy.description}
      confirmLabel="Revogar"
      change={copy.change}
      illustration={<KeyRevokeIllustration kind={apiKey.kind} />}
      isDestructive
      isPending={props.isPending}
      triggerLabel={`Revogar ${keyLabel(apiKey)}`}
      onConfirm={props.onRevoke}
    >
      <TrashBin aria-hidden="true" className="size-4" />
      Revogar antiga
    </ConfirmButton>
  )
}
