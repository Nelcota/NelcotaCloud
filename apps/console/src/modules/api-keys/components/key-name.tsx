import Globe from '~icons/solar/global-linear'
import LockKeyhole from '~icons/solar/lock-keyhole-minimalistic-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/**
 * The key's name over its kind, led by the kind's icon in a fixed column so every row lines up
 * whatever the name's length.
 */
export function KeyName({ apiKey }: { apiKey: ApiKeySummary }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <KindIcon kind={apiKey.kind} />
      <div className="grid min-w-0">
        <NameText name={apiKey.name} />
        <span className="text-muted-foreground text-xs">{apiKey.kind}</span>
      </div>
    </div>
  )
}

function NameText({ name }: { name: string }): JSX.Element {
  if (name === '') {
    return <span className="text-muted-foreground">Sem nome</span>
  }

  return <span className="truncate font-medium">{name}</span>
}

/** A lock for the secret key (server only), a globe for the publishable one (public, in apps). */
function KindIcon({ kind }: { kind: string }): JSX.Element {
  const className = 'text-muted-foreground size-5 shrink-0'

  if (kind === 'secret') {
    return <LockKeyhole aria-hidden="true" className={className} />
  }

  return <Globe aria-hidden="true" className={className} />
}
