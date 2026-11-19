import SearchX from '~icons/solar/magnifier-close-linear'
import Users from '~icons/solar/users-group-rounded-linear'
import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import type { UserStatusFilter } from '@/modules/users/model/user-status-filter'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
import { EmptyState } from '@/shared/ui/empty-state'

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
  onFilterChange: (filter: UserListFilter) => void
  /** Users matching the search in any status; "Buscar em todos" is offered only when some do. */
  allStatusCount: number | undefined
  projectId: string
}

/**
 * Why the list is empty (no users yet, none matching the search, none in that state) and the
 * way back to a list that has someone.
 */
export function UsersEmptyState(props: UsersEmptyStateProps): JSX.Element {
  const { filter, onFilterChange, allStatusCount } = props
  const search = filter.search.trim()
  const status = filter.status

  if (search !== '' && status !== 'all' && allStatusCount !== 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhum usuário encontrado"
        description={`Nenhum usuário ${STATUS_WORDS[status]} tem “${search}” no email.`}
        action={
          <Button variant="outline" onClick={() => onFilterChange({ search, status: 'all' })}>
            Buscar em todos
          </Button>
        }
      />
    )
  }

  if (search !== '') {
    return (
      <EmptyState
        icon={SearchX}
        title="Nenhum usuário encontrado"
        description={`Nenhum email contém “${search}”.`}
        action={
          <Button variant="outline" onClick={() => onFilterChange({ search: '', status: 'all' })}>
            Limpar busca
          </Button>
        }
      />
    )
  }

  if (status !== 'all') {
    return (
      <EmptyState
        icon={Users}
        title={`Nenhum usuário ${STATUS_WORDS[status]}`}
        description={ALL_CLEAR[status]}
        action={
          <Button variant="outline" onClick={() => onFilterChange({ search: '', status: 'all' })}>
            Ver todos
          </Button>
        }
      />
    )
  }

  return (
    <EmptyState
      icon={Users}
      title="Nenhum usuário ainda"
      description="Quando alguém criar uma conta no seu app, ela aparece aqui."
      action={
        <Link
          to="/projects/$projectId"
          params={{ projectId: props.projectId }}
          className={buttonVariants({ variant: 'outline' })}
        >
          Ver como conectar
        </Link>
      }
    />
  )
}
