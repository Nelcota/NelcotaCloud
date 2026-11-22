import type { JSX } from 'react'

import { countActive, isLastSecret } from '@/modules/api-keys/components/key-activity'
import { KeyTable } from '@/modules/api-keys/components/key-table'
import { KeysSkeleton } from '@/modules/api-keys/components/keys-skeleton'
import { type MoreKeys, RevokedKeys } from '@/modules/api-keys/components/revoked-keys'
import { useRevokeApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type KeyListsProps = {
  projectId: string
  /** `undefined` while loading. */
  keys: ApiKeySummary[] | undefined
  hasFailed: boolean
  more: MoreKeys
}

/** Publishable and secret keys as two tables, then the revoked ones behind a closed panel. */
export function KeyLists({ projectId, keys, hasFailed, more }: KeyListsProps): JSX.Element | null {
  const revocation = useRevokeApiKeyMutation(projectId)

  // The page's load error already says it all, so neither the lists nor a skeleton show.
  if (keys === undefined && hasFailed) {
    return null
  }

  if (keys === undefined) {
    return <KeysSkeleton />
  }

  async function revoke(keyId: string): Promise<void> {
    await revocation.mutateAsync(keyId)
  }

  const revoking = {
    isPending: revocation.isPending,
    keyId: revocation.variables,
    onRevoke: revoke,
  }

  return (
    <div className="flex flex-col gap-6">
      <KeyTable
        title="Publicáveis"
        description="Vão no app, web ou mobile. Respeitam o RLS."
        kind="publishable"
        keys={keys}
        revocation={revoking}
      />
      <KeyTable
        title="Secretas"
        description="Só no servidor. Ignoram o RLS e acessam a API admin."
        kind="secret"
        keys={keys}
        revocation={revoking}
        footer={<LastSecretNote activeSecrets={countActive(keys, 'secret')} />}
      />
      <RevokedKeys keys={keys} more={more} />
    </div>
  )
}

/** Said once below the rows, instead of inside the disabled menu item. */
function LastSecretNote({ activeSecrets }: { activeSecrets: number }): JSX.Element | null {
  if (activeSecrets === 0 || isLastSecret('secret', activeSecrets) === false) {
    return null
  }

  return (
    <p className="border-t bg-surface px-4 py-2.5 text-sm text-muted-foreground">
      Crie outra chave secreta antes de revogar a última ativa.
    </p>
  )
}
