import { Database, KeyRound as Key, Plug, ShieldEllipsis as Shield } from 'lucide-react'
import type { JSX, ReactNode } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import type { IconComponent } from '@/shared/ui/icon-component'

/** The pieces the API provisions in the one request that creates a project. */
export function ProvisionedParts({ slug }: { slug: string }): JSX.Element {
  return (
    <ul className="grid gap-0.5 border-t border-border/60 p-1.5">
      <Part icon={Database} title="Banco Postgres">
        <Mono>tenant_{slug}</Mono>
      </Part>
      <Part icon={Shield} title="Auth">
        Usuários, sessões e JWKS
      </Part>
      <Part icon={Key} title="Chaves de API">
        <Mono>nc_pk_… · nc_sk_…</Mono>
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
    <li className="flex min-w-0 gap-2.5 rounded-md px-1.5 py-1.5">
      <Glyph aria-hidden className="mt-px size-4.5 shrink-0 text-muted-foreground" />
      <div className="grid min-w-0 gap-0.5">
        <p className="text-xs font-medium text-heading">{title}</p>
        <div className="grid min-w-0 text-2xs text-muted-foreground">{children}</div>
      </div>
    </li>
  )
}

function Mono({ children }: { children: ReactNode }): JSX.Element {
  return <code className="truncate font-mono text-xs text-muted-foreground">{children}</code>
}
