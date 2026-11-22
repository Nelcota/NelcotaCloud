import type { JSX } from 'react'

import { activeKeys, countActive } from '@/modules/api-keys/components/key-activity'
import { SIGNING_ALGORITHM } from '@/modules/api-keys/components/project-endpoints'
import type { components } from '@/shared/api/api-schema'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { StatCard } from '@/shared/ui/stat-card'
import { StatusDot } from '@/shared/ui/status-dot'

type ApiKeySummary = components['schemas']['ApiKeySummary']

/** The API refuses a new key once the project holds this many active ones, of both kinds. */
const MAX_ACTIVE_KEYS = 20

const SKELETONS = ['publishable', 'secret', 'total', 'signing']

type KeyStatsProps = {
  /** `undefined` while loading. */
  keys: ApiKeySummary[] | undefined
  hasFailed: boolean
}

/** How many keys work of each kind, against the limit, and how tokens are signed. */
export function KeyStats({ keys, hasFailed }: KeyStatsProps): JSX.Element | null {
  if (keys === undefined && hasFailed) {
    return null
  }

  if (keys === undefined) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-busy="true">
        {SKELETONS.map((name) => (
          <Skeleton key={name} className="h-28 rounded-xl" />
        ))}
      </div>
    )
  }

  const secrets = countActive(keys, 'secret')

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="Publicáveis ativas"
        value={countActive(keys, 'publishable')}
        hint="Vão no app"
      />
      <StatCard label="Secretas ativas" value={secrets} hint={<SecretHint count={secrets} />} />
      <StatCard
        label="Total ativo"
        value={`${activeKeys(keys).length} de ${MAX_ACTIVE_KEYS}`}
        hint="Limite por projeto"
      />
      <StatCard label="Chave de assinatura" value={SIGNING_ALGORITHM} hint="Ed25519 no JWKS" />
    </div>
  )
}

function SecretHint({ count }: { count: number }): JSX.Element {
  if (count === 0) {
    return (
      <span className="flex items-center gap-1.5">
        <StatusDot tone="warning" label="Atenção" />
        Servidor sem acesso
      </span>
    )
  }

  return <span>Só no servidor</span>
}
