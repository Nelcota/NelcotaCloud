import ArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'

import { RoleBadge } from '@/modules/projects/components/role-badge'

/**
 * What each role can do, stated once and in full; folded by default, since it matters when
 * deciding who to invite or promote, not on every visit.
 */
export function RoleSummary(): JSX.Element {
  return (
    <details className="group rounded-xl border">
      <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
        O que cada papel pode fazer
        <ArrowDown
          aria-hidden="true"
          className="text-muted-foreground size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="grid gap-4 border-t px-5 py-4 sm:grid-cols-2 sm:gap-8">
        <RoleLine role="member">
          Gerencia o projeto inteiro: usuários do app, chaves de API (inclusive secret keys), chave
          de assinatura, login social, email e configurações.
        </RoleLine>
        <RoleLine role="owner">
          Tudo o que um membro faz, mais convidar e remover pessoas, mudar papéis, transferir e
          excluir o projeto.
        </RoleLine>
      </div>
    </details>
  )
}

type RoleLineProps = { role: 'owner' | 'member'; children: string }

function RoleLine({ role, children }: RoleLineProps): JSX.Element {
  return (
    <p className="text-muted-foreground grid justify-items-start gap-2 text-sm text-pretty">
      <RoleBadge role={role} />
      {children}
    </p>
  )
}
