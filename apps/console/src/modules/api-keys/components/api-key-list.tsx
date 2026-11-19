import type { JSX } from 'react'

import { activeKeys, isRevokedKey } from '@/modules/api-keys/components/key-activity'
import { KeyGroup } from '@/modules/api-keys/components/key-group'
import { KEY_KINDS, type KeyKind } from '@/modules/api-keys/components/key-kinds'
import { KeyRow } from '@/modules/api-keys/components/key-row'
import { NewKeyNotice } from '@/modules/api-keys/components/new-key-notice'
import { RevokedKeys } from '@/modules/api-keys/components/revoked-keys'
import type { KeyRotationState } from '@/modules/api-keys/components/use-key-rotation'
import { useRevokeApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import { ErrorAlert } from '@/shared/ui/error-alert'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/skeleton'

type ApiKeySummary = components['schemas']['ApiKeySummary']

type ApiKeyListProps = {
  /** `undefined` while loading. */
  keys: ApiKeySummary[] | undefined
  hasFailed: boolean
  rotation: KeyRotationState
}

/** One group per kind of key, then the revoked keys folded away. */
export function ApiKeyList({ keys, hasFailed, rotation }: ApiKeyListProps): JSX.Element | null {
  if (keys === undefined && hasFailed) {
    return null
  }

  if (keys === undefined) {
    return <KeysSkeleton />
  }

  return (
    <>
      {KEY_KINDS.map((keyKind) => (
        <KindGroup key={keyKind.kind} keyKind={keyKind} keys={keys} rotation={rotation} />
      ))}
      <RevokedKeys keys={keys.filter(isRevokedKey)} />
    </>
  )
}

type KindGroupProps = {
  keyKind: KeyKind
  keys: ApiKeySummary[]
  rotation: KeyRotationState
}

function KindGroup({ keyKind, keys, rotation }: KindGroupProps): JSX.Element {
  const revocation = useRevokeApiKeyMutation(rotation.projectId)
  const ofKind = activeKeys(keys).filter((key) => key.kind === keyKind.kind)

  return (
    <KeyGroup
      keyKind={keyKind}
      count={ofKind.length}
      notice={
        <>
          <NewKeyNotice
            apiKey={kindOrUndefined(rotation.created, keyKind)}
            onDismiss={rotation.dismiss}
          />
          <ReplaceFailureAlert failure={rotation.replaceFailure} kind={keyKind.kind} />
        </>
      }
    >
      {ofKind.map((key) => (
        <KeyRow
          key={key.id}
          apiKey={key}
          revocation={{
            activeOfKind: ofKind.length,
            isPending: revocation.isPending && revocation.variables === key.id,
            onRevoke: async () => {
              await revocation.mutateAsync(key.id)
            },
          }}
          rotation={{
            stage: rotation.stageOf(key.id),
            isReplacing: rotation.replacingId === key.id,
            onReplace: () => rotation.replace(key),
          }}
        />
      ))}
    </KeyGroup>
  )
}

type ReplaceFailureAlertProps = { failure: KeyRotationState['replaceFailure']; kind: string }

/** A failed replacement shows in the group of the key it was for, not at the top of the page. */
function ReplaceFailureAlert({ failure, kind }: ReplaceFailureAlertProps): JSX.Element | null {
  if (failure === null || failure.apiKey.kind !== kind) {
    return null
  }

  return (
    <div className="border-b px-5 py-4">
      <ErrorAlert error={failure.error} />
    </div>
  )
}

/** The key just created belongs in its own kind's group only. */
function kindOrUndefined<Created extends { kind: string }>(
  created: Created | undefined,
  keyKind: KeyKind,
): Created | undefined {
  if (created === undefined || created.kind !== keyKind.kind) {
    return undefined
  }

  return created
}

const SKELETON_GROUPS = ['publishable', 'secret']

function KeysSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" aria-label="Carregando chaves" className="grid gap-8">
      {SKELETON_GROUPS.map((group) => (
        <div key={group} className="grid gap-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ))}
    </div>
  )
}
