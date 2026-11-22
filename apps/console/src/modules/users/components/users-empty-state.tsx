import SearchX from '~icons/solar/magnifier-close-linear'
import Users from '~icons/solar/users-group-rounded-linear'
import type { JSX } from 'react'

import type { UserStatusFilter } from '@/modules/users/api/list-users'
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
  filter: UserListFilter
  /** Clears the search and the status filter, the way out of an empty filtered list. */
  onClearFilter: () => void
}

/** Why the list is empty: no users yet, none matching the search, or none in that state. */
export function UsersEmptyState({ filter, onClearFilter }: UsersEmptyStateProps): JSX.Element {
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
      description="Quando alguém criar uma conta no seu app, ela aparece aqui."
    />
  )
}

function searchMiss(search: string, status: UserStatusFilter): string {
  if (status === 'all') {
    return `Nenhum email contém “${search}”. Confira a grafia ou busque só uma parte.`
  }

  return `Nenhum usuário ${STATUS_WORDS[status]} tem “${search}” no email.`
}
