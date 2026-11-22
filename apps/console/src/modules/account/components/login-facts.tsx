import Database from '~icons/solar/database-linear'
import Key from '~icons/solar/key-linear'
import Shield from '~icons/solar/shield-keyhole-linear'
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
    <ul className="grid grid-cols-3 gap-4">
      {FACTS.map((fact) => (
        <FactItem key={fact.id} fact={fact} />
      ))}
    </ul>
  )
}

function FactItem({ fact }: { fact: Fact }): JSX.Element {
  const Glyph = fact.icon

  return (
    <li className="grid min-w-0 content-start gap-1.5 border-t pt-4">
      <Glyph aria-hidden className="size-5 text-primary" />
      <p className="text-sm font-medium text-heading">{fact.title}</p>
      <p className="truncate font-mono text-xs text-muted-foreground" title={fact.detail}>
        {fact.detail}
      </p>
    </li>
  )
}
