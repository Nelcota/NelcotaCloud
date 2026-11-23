import ArrowDown from '~icons/solar/alt-arrow-down-linear'
import type { JSX } from 'react'

import { RoleBadge } from '@/modules/projects/components/role-badge'
import type { components } from '@/shared/api/api-schema'

type ProjectRole = components['schemas']['ProjectRole']

/**
 * What each role can do, stated once and in full; folded by default, since it matters when
 * deciding who to invite or promote, not on every visit.
 */
export function RoleSummary(): JSX.Element {
  return (
    <details className="surface group">
      <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-medium transition-colors [&::-webkit-details-marker]:hidden">
        O que cada papel pode fazer
        <ArrowDown
          aria-hidden="true"
          className="text-muted-foreground size-5 transition-transform group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="grid gap-4 border-t px-5 py-4 md:grid-cols-3 md:gap-8">
        <RoleLine role="viewer">
          Vê tudo o que um membro vê, sem mudar nada: dados, configurações, chaves e webhooks ficam
          só para leitura.
        </RoleLine>
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

type RoleLineProps = { role: ProjectRole; children: string }

function RoleLine({ role, children }: RoleLineProps): JSX.Element {
  return (
    <p className="text-muted-foreground grid justify-items-start gap-2 text-sm text-pretty">
      <RoleBadge role={role} />
      {children}
    </p>
  )
}
