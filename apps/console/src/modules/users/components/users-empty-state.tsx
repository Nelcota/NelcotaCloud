import { SearchX, Users } from 'lucide-react'
import type { JSX } from 'react'

import type { UserStatusFilter } from '@/modules/users/api/list-users'
import { RouterLink } from '@/shared/routing/router-link'
import { EmptyState } from '@/shared/ui/empty-state'
import { Button } from '@/shared/ui/primitives/button'

export type UserListFilter = { search: string; status: UserStatusFilter }

type Status = Exclude<UserStatusFilter, 'all'>

/** Completes "Nenhum usuário …". */
const STATUS_WORDS: Record<Status, string> = {
  unverified: 'com email não confirmado',
  banned: 'bloqueado',
}

const ALL_CLEAR: Record<Status, string> = {
  unverified: 'Todos os usuários já confirmaram o email.',
  banned: 'Ninguém está bloqueado neste projeto.',
}

type UsersEmptyStateProps = {
  projectId: string
  filter: UserListFilter
  /** Clears the search and the status filter, the way out of an empty filtered list. */
  onClearFilter: () => void
}

/** Why the list is empty: no users yet, none matching the search, or none in that state. */
export function UsersEmptyState(props: UsersEmptyStateProps): JSX.Element {
  const { filter, onClearFilter } = props
  const clearAction = (
    <Button type="button" variant="outline" size="sm" onClick={onClearFilter}>
      Limpar filtros
    </Button>
  )
  const search = filter.search.trim()
  const status = filter.status

  if (search !== '') {
    return (
      <EmptyState
        isCompact
        icon={<SearchX aria-hidden />}
        title="Nenhum usuário encontrado"
        description={searchMiss(search, status)}
        actions={clearAction}
      />
    )
  }

  if (status !== 'all') {
    return (
      <EmptyState
        isCompact
        icon={<Users aria-hidden />}
        title={`Nenhum usuário ${STATUS_WORDS[status]}`}
        description={ALL_CLEAR[status]}
        actions={clearAction}
      />
    )
  }

  return (
    <EmptyState
      icon={<Users aria-hidden />}
      title="Nenhum usuário ainda"
      description="Os usuários aparecem aqui quando alguém se cadastra pelo seu app, com a chave publicável."
      actions={
        <Button asChild size="sm">
          <RouterLink href={`/projects/${props.projectId}/keys`}>Ver chaves de API</RouterLink>
        </Button>
      }
    />
  )
}

function searchMiss(search: string, status: UserStatusFilter): string {
  if (status === 'all') {
    return `Nenhum email contém “${search}”. Confira a grafia ou busque só uma parte.`
  }

  return `Nenhum usuário ${STATUS_WORDS[status]} tem “${search}” no email.`
}
