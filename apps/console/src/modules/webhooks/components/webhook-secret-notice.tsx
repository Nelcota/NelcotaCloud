import type { JSX } from 'react'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { InlineCode } from '@/shared/ui/inline-code'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

type WebhookSecretNoticeProps = {
  revealed: { url: string; secret: string } | undefined
  /** The user confirms the secret is stored, which hides it for good. */
  onDismiss: () => void
}

/**
 * A signing secret just created or rotated: the only time the API returns it. Only the title
 * is announced; reading the secret aloud would leak it.
 */
export function WebhookSecretNotice({
  revealed,
  onDismiss,
}: WebhookSecretNoticeProps): JSX.Element | null {
  if (revealed === undefined) {
    return null
  }

  return (
    <Notice tone="warning" title="Copie o segredo de assinatura agora">
      <div className="mt-1 flex flex-col gap-3">
        <span className="wrap-anywhere">
          Ele não aparece de novo. Seu servidor confere com ele o header{' '}
          <InlineCode>webhook-signature</InlineCode> de {revealed.url}.
        </span>
        <CopyableValue label="Segredo" value={revealed.secret} />
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            Já guardei o segredo
          </Button>
        </div>
      </div>
      <SecretLeaveGuard isActive subject="Segredo do webhook" />
    </Notice>
  )
}
