import type { JSX } from 'react'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

/** Publishable keys stay listed in full; only a secret key is shown this once. */
const SECRET_KIND = 'secret'

type NewKeyNoticeProps = {
  apiKey: { kind: string; name: string; key: string } | undefined
  /** The user confirms the key is stored, which hides it for good. */
  onDismiss: () => void
}

/**
 * A key just created, shown as a warning because this is the only time the API returns it.
 * Only the title is announced; reading the key itself aloud would leak it.
 */
export function NewKeyNotice({ apiKey, onDismiss }: NewKeyNoticeProps): JSX.Element | null {
  if (apiKey === undefined || apiKey.kind !== SECRET_KIND) {
    return null
  }

  return (
    <Notice tone="warning" title={`Copie a nova secret key${keyNameSuffix(apiKey.name)} agora`}>
      <div className="mt-1 flex flex-col gap-3">
        <span>Ela não aparece de novo. Guarde-a antes de sair desta página.</span>
        <CopyableValue label="Secret key" value={apiKey.key} />
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            Já guardei a chave
          </Button>
        </div>
      </div>
      <SecretLeaveGuard isActive subject="Secret key nova" />
    </Notice>
  )
}

function keyNameSuffix(name: string): string {
  if (name === '') {
    return ''
  }

  return ` “${name}”`
}
