import type { JSX } from 'react'

import { Spinner } from '@/shared/ui/primitives/spinner'

/** What the API prepares while the project is created in one request. */
export function CreationProgress({ slug }: { slug: string }): JSX.Element {
  const parts = [
    { id: 'database', label: 'Banco Postgres', detail: `tenant_${slug}` },
    { id: 'migrations', label: 'Schema auth e roles do Data API', detail: 'migrations' },
    { id: 'keys', label: 'Chaves de API e de assinatura', detail: 'nc_pk_ · nc_sk_ · EdDSA' },
  ]

  return (
    <section aria-labelledby="creation-progress-title" aria-busy="true" className="grid gap-8">
      <h2
        id="creation-progress-title"
        role="status"
        className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-heading"
      >
        <Spinner aria-hidden className="size-7 shrink-0 text-primary" />
        Criando o projeto…
      </h2>
      <ul className="grid divide-y rounded-xl border bg-card text-sm">
        {parts.map((part) => (
          <li key={part.id} className="flex min-w-0 items-center gap-3 px-4 py-3">
            <Spinner aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-heading">{part.label}</span>
            <code className="ms-auto truncate font-mono text-xs text-muted-foreground">
              {part.detail}
            </code>
          </li>
        ))}
      </ul>
    </section>
  )
}
