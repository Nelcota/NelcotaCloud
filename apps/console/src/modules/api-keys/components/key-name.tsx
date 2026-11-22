import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** An unnamed key is called by its kind. */
const KIND_TITLES: Record<string, string> = {
  publishable: 'Chave publicável',
  secret: 'Chave secreta',
}

/** The key's name over its id, the value the API takes to revoke it. */
export function KeyName({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  return (
    <span className="grid min-w-0 gap-0.5">
      <NameText apiKey={apiKey} />
      <code title={apiKey.id} className="truncate font-mono text-2xs text-muted-foreground">
        <span className="sr-only">ID </span>
        {apiKey.id}
      </code>
    </span>
  )
}

function NameText({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  const name = apiKey.name.trim()

  if (name === '') {
    return (
      <span className="truncate text-muted-foreground">
        {KIND_TITLES[apiKey.kind] ?? apiKey.kind}
      </span>
    )
  }

  return (
    <span className="truncate font-medium text-foreground" title={name}>
      {name}
    </span>
  )
}
