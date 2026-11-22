import { Database, KeyRound as Key, ShieldEllipsis as Shield } from 'lucide-react'
import type { JSX } from 'react'

import type { IconComponent } from '@/shared/ui/icon-component'

type Fact = { id: string; icon: IconComponent; title: string; detail: string }

const FACTS: readonly Fact[] = [
  {
    id: 'auth',
    icon: Shield,
    title: 'Auth multitenant',
    detail: '/auth/v1 · JWT EdDSA · TOTP',
  },
  {
    id: 'database',
    icon: Database,
    title: 'Postgres com RLS + REST',
    detail: '/rest/v1 · row level security',
  },
  {
    id: 'keys',
    icon: Key,
    title: 'Chaves, JWKS e webhooks',
    detail: 'nc_pk_ · /auth/v1/jwks',
  },
]

/** Three facts a developer checks first, under the console miniature. */
export function LoginFacts(): JSX.Element {
  return (
    <ul className="grid grid-cols-3 gap-2">
      {FACTS.map((fact) => (
        <FactItem key={fact.id} fact={fact} />
      ))}
    </ul>
  )
}

function FactItem({ fact }: { fact: Fact }): JSX.Element {
  const Glyph = fact.icon

  return (
    <li className="grid min-w-0 content-start gap-1 rounded-xl bg-surface p-3">
      <Glyph aria-hidden className="mb-1 size-4 text-brand" />
      <p className="text-xs font-medium text-heading">{fact.title}</p>
      <p className="truncate font-mono text-2xs text-muted-foreground" title={fact.detail}>
        {fact.detail}
      </p>
    </li>
  )
}
