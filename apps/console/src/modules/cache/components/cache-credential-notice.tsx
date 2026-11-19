import type { JSX } from 'react'
import { useId } from 'react'
import TriangleAlert from '~icons/solar/danger-triangle-linear'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { Button } from '@/shared/ui/button'
import { CopyableValue } from '@/shared/ui/copyable-value'

type CacheCredentialNoticeProps = { token: string; onDismiss: () => void }

export function CacheCredentialNotice({
  token,
  onDismiss,
}: CacheCredentialNoticeProps): JSX.Element {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="grid gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
        <div role="alert">
          <h2 id={headingId} className="text-sm">
            Copie a credencial agora
          </h2>
          <p className="text-muted-foreground text-sm">
            Guarde-a no seu servidor. Ela só é exibida uma vez.
          </p>
        </div>
      </div>
      <CopyableValue label="Credencial de cache" value={token} autoFocusCopy />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Já guardei a credencial
        </Button>
      </div>
      <SecretLeaveGuard isActive subject="Credencial de cache" />
    </section>
  )
}
