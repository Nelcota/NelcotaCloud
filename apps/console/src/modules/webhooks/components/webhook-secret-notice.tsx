import TriangleAlert from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'
import { useId } from 'react'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { CopyableValue } from '@/shared/ui/copyable-value'
import { Button } from '@/shared/ui/button'

type WebhookSecretNoticeProps = {
  revealed: { url: string; secret: string } | undefined
  /** The user confirms the secret is stored, which hides it for good. */
  onDismiss: () => void
}

/**
 * A signing secret just created or rotated: the only time the API returns it. Only the heading
 * is announced; reading the secret aloud would leak it.
 */
export function WebhookSecretNotice({
  revealed,
  onDismiss,
}: WebhookSecretNoticeProps): JSX.Element | null {
  const headingId = useId()

  if (revealed === undefined) {
    return null
  }

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div role="alert">
          <h2 id={headingId} className="text-sm">
            Copie o segredo de assinatura agora
          </h2>
          <p className="text-muted-foreground text-sm break-all">
            Ele não aparece de novo. Seu servidor usa ele para conferir o header webhook-signature
            de {revealed.url}.
          </p>
        </div>
      </div>
      <CopyableValue label="Segredo" value={revealed.secret} autoFocusCopy />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Já guardei o segredo
        </Button>
      </div>
      <SecretLeaveGuard isActive subject="Segredo do webhook" />
    </section>
  )
}
