import Database from '~icons/solar/database-linear'
import Key from '~icons/solar/key-linear'
import Plug from '~icons/solar/plug-circle-linear'
import Shield from '~icons/solar/shield-keyhole-linear'
import type { JSX, ReactNode } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { IconComponent } from '@/shared/ui/icon-component'

/** The pieces the API provisions in the one request that creates a project. */
export function ProvisionedParts({ slug }: { slug: string }): JSX.Element {
  return (
    <ul className="grid divide-y text-sm">
      <Part icon={Database} title="Banco Postgres">
        <Mono>tenant_{slug}</Mono>
      </Part>
      <Part icon={Shield} title="Auth">
        Usuários, sessões e chaves JWT (JWKS)
      </Part>
      <Part icon={Key} title="Chaves de API">
        <Mono>nc_pk_…</Mono> pública e <Mono>nc_sk_…</Mono> secreta
      </Part>
      <Part icon={Plug} title="Endpoints">
        <Mono>{API_BASE_URL}/auth/v1</Mono>
        <Mono>{API_BASE_URL}/rest/v1</Mono>
      </Part>
    </ul>
  )
}

type PartProps = { icon: IconComponent; title: string; children: ReactNode }

function Part({ icon: Glyph, title, children }: PartProps): JSX.Element {
  return (
    <li className="flex min-w-0 gap-3 px-4 py-3">
      <Glyph aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 gap-1">
        <p className="font-medium text-heading">{title}</p>
        <div className="grid min-w-0 gap-0.5 text-xs text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function Mono({ children }: { children: ReactNode }): JSX.Element {
  return <code className="truncate font-mono text-xs text-foreground">{children}</code>
}
