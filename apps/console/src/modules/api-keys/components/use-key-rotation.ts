import { useState } from 'react'

import { type ApiKeyKind, KEY_KINDS } from '@/modules/api-keys/components/key-kinds'
import type { KeyStage } from '@/modules/api-keys/components/key-tags'
import { inferReplacements, replacementName } from '@/modules/api-keys/model/key-replacements'
import { useCreateApiKeyMutation } from '@/modules/api-keys/queries/use-api-keys'
import type { components } from '@/shared/api/api-schema'
import { showFlash } from '@/shared/lib/flash-notice'

type ApiKeySummary = components['schemas']['ApiKeySummary']
type IssuedApiKey = components['schemas']['IssuedApiKey']

/** A replacement that failed, kept with its key so the error shows by that key's group. */
export type ReplaceFailure = { apiKey: ApiKeySummary; error: unknown }

export type KeyRotationState = {
  projectId: string
  /** The key created last on this page, while its secret may still need copying. */
  created: IssuedApiKey | undefined
  isCreating: boolean
  /** The key being replaced right now, so only its row waits. */
  replacingId: string | null
  replaceFailure: ReplaceFailure | null
  create: (kind: ApiKeyKind, name: string) => Promise<void>
  replace: (apiKey: ApiKeySummary) => Promise<void>
  dismiss: () => void
  stageOf: (keyId: string) => KeyStage
}

/**
 * Creating keys and replacing old ones without stopping the app: a replacement is created next
 * to the old key, which is then marked to revoke once the app runs on the new one. The pairing
 * is read back from the replacement's name, so it survives a reload, days later.
 */
export function useKeyRotation(projectId: string, active: ApiKeySummary[]): KeyRotationState {
  const creation = useCreateApiKeyMutation(projectId)
  const [replacingId, setReplacingId] = useState<string | null>(null)
  const [replaceFailure, setReplaceFailure] = useState<ReplaceFailure | null>(null)
  const replacements = inferReplacements(active)
  const newIds = new Set(replacements.values())

  async function create(kind: ApiKeyKind, name: string): Promise<IssuedApiKey> {
    const created = await creation.mutateAsync({ kind, name })
    announcePublishable(created)

    return created
  }

  async function replace(apiKey: ApiKeySummary): Promise<void> {
    const kind = KEY_KINDS.find((candidate) => candidate.kind === apiKey.kind)?.kind

    if (kind === undefined) {
      setReplaceFailure({ apiKey, error: new Error(`Tipo de chave desconhecido: ${apiKey.kind}`) })
      return
    }

    setReplacingId(apiKey.id)
    setReplaceFailure(null)

    try {
      await create(kind, replacementName(apiKey))
    } catch (error) {
      setReplaceFailure({ apiKey, error })
    } finally {
      setReplacingId(null)
    }
  }

  function stageOf(keyId: string): KeyStage {
    if (replacements.has(keyId)) {
      return 'to-revoke'
    }

    if (newIds.has(keyId) || creation.data?.id === keyId) {
      return 'new'
    }

    return 'steady'
  }

  return {
    projectId,
    created: creation.data,
    isCreating: creation.isPending,
    replacingId,
    replaceFailure,
    create: async (kind, name) => {
      await create(kind, name)
    },
    replace,
    dismiss: () => creation.reset(),
    stageOf,
  }
}

/** A publishable key is not shown in a notice: it lands in the list, which this sentence points to. */
function announcePublishable(created: IssuedApiKey): void {
  if (created.kind !== 'publishable') {
    return
  }

  showFlash('Chave do app criada. Copie-a na lista quando precisar.')
}
