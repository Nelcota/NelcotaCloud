import { KeyRound } from 'lucide-react'
import type { JSX } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'

type NewKeyNoticeProps = {
  apiKey: { kind: string; key: string } | undefined
}

/** A key just created: highlighted, because this is the only time the API returns it. */
export function NewKeyNotice({ apiKey }: NewKeyNoticeProps): JSX.Element | null {
  if (apiKey === undefined) {
    return null
  }

  return (
    <section
      role="status"
      className="border-primary/30 bg-primary/5 grid gap-3 rounded-xl border p-4"
    >
      <div className="flex items-start gap-3">
        <KeyRound className="text-primary mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
        <div>
          <h2 className="text-sm font-semibold">Nova {apiKey.kind} key criada</h2>
          <p className="text-muted-foreground text-sm">Copie agora: ela não aparece de novo.</p>
        </div>
      </div>
      <SecretReveal label={`${apiKey.kind} key`} value={apiKey.key} />
    </section>
  )
}
