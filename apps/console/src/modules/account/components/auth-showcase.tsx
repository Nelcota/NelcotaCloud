import type { JSX } from 'react'

import { ShowcaseCodeCard } from '@/modules/account/components/showcase-code-card'
import { ShowcaseEventsCard } from '@/modules/account/components/showcase-events-card'

const PARTS = ['/auth/v1', '/rest/v1', '/storage/v1', 'webhooks'] as const

/** Beside the form on wide screens: what a project gives you, shown the way the console shows it. */
export function AuthShowcase(): JSX.Element {
  return (
    <aside
      aria-label="O que cada projeto tem"
      className="hidden min-w-0 flex-col justify-center gap-8 overflow-hidden px-10 py-12 lg:flex xl:px-16"
    >
      <div className="grid max-w-xl gap-3">
        <h2 className="text-3xl font-semibold text-balance text-heading">
          Auth, Postgres e arquivos para cada projeto.
        </h2>
        <p className="text-base text-pretty text-muted-foreground">
          Usuários, banco com row level security e chaves de API, prontos quando o projeto nasce e
          servidos por uma API só.
        </p>
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="APIs do projeto">
          {PARTS.map((part) => (
            <li
              key={part}
              className="rounded-sm bg-surface-hover px-2 py-0.5 font-mono text-xs text-foreground"
            >
              {part}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid max-w-xl gap-3">
        <ShowcaseCodeCard />
        <ShowcaseEventsCard />
      </div>
    </aside>
  )
}
