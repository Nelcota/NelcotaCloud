import { keyLabel } from '@/modules/api-keys/components/revoke-copy'
import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

export type ReplaceCopy = { title: string; description: string }

/**
 * What replacing a key does, said before it happens: a new key is created at once, a server
 * key is shown only that once, and the old key keeps working until it is revoked.
 */
export function replaceCopy(apiKey: ApiKeySummary): ReplaceCopy {
  const label = keyLabel(apiKey)
  const title = `Substituir a ${label.charAt(0).toLowerCase()}${label.slice(1)}?`

  if (apiKey.kind === 'secret') {
    return {
      title,
      description:
        'Cria agora uma chave do servidor nova, ao lado desta. Ela aparece uma única vez: tenha onde guardá-la. Esta continua funcionando até você revogá-la, depois de trocar no servidor.',
    }
  }

  return {
    title,
    description:
      'Cria agora uma chave do app nova, ao lado desta. Esta continua funcionando até você revogá-la, depois de publicar o app com a nova.',
  }
}
