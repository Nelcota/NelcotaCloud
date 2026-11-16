import TriangleAlert from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'
import { useId } from 'react'

import { SecretLeaveGuard } from '@/modules/api-keys/components/secret-leave-guard'
import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { Button } from '@/shared/ui/button'

type NewKeyNoticeProps = {
  apiKey: { kind: string; name: string; key: string } | undefined
  /** The user confirms the key is stored, which hides it for good. */
  onDismiss: () => void
}

/**
 * A key just created, shown as a warning because this is the only time the API returns it.
 * Only the heading is announced; reading the key itself aloud would leak it.
 */
export function NewKeyNotice({ apiKey, onDismiss }: NewKeyNoticeProps): JSX.Element | null {
  const headingId = useId()

  if (apiKey === undefined) {
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
            Copie a nova {apiKey.kind} key{keyNameSuffix(apiKey.name)} agora
          </h2>
          <p className="text-muted-foreground text-sm">
            Ela não aparece de novo. Guarde-a antes de sair desta página.
          </p>
        </div>
      </div>
      <SecretReveal label={`${apiKey.kind} key`} value={apiKey.key} autoFocusCopy />
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onDismiss}>
          Já guardei a chave
        </Button>
      </div>
      <SecretLeaveGuard isActive />
    </section>
  )
}

function keyNameSuffix(name: string): string {
  if (name === '') {
    return ''
  }

  return ` “${name}”`
}
