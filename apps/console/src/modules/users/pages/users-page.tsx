import Search from '~icons/solar/magnifier-linear'
import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import { UserActionResult } from '@/modules/users/components/user-action-result'
import { UsersPagination } from '@/modules/users/components/users-pagination'
import { UsersTable } from '@/modules/users/components/users-table'
import {
  USERS_PAGE_SIZE,
  type UserAction,
  useUserActionMutation,
  useUsersQuery,
} from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'

type User = components['schemas']['User']

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()
  const [search, setSearch] = useState('')
  const [offset, setOffset] = useState(0)
  const deferredSearch = useDeferredValue(search)
  const users = useUsersQuery(projectId, {
    email: deferredSearch,
    offset,
    limit: USERS_PAGE_SIZE,
  })
  const action = useUserActionMutation(projectId)

  function changeSearch(value: string): void {
    setSearch(value)
    setOffset(0)
  }

  function runAction(user: User, kind: UserAction): void {
    action.mutate({ action: kind, userId: user.id, email: user.email })
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Usuários"
        description="As contas do seu app. Bloqueie, encerre sessões ou remova o MFA de quem precisar."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchField value={search} onChange={changeSearch} />
        <UserCount total={users.data?.total} />
      </div>
      <ErrorAlert error={users.error ?? action.error} />
      <UserActionResult done={doneAction(action.isSuccess, action.variables)} />
      <UsersTable
        users={users.data?.users}
        search={deferredSearch}
        hasFailed={users.isError}
        pendingUserId={pendingUserId(action.isPending, action.variables)}
        onAction={runAction}
      />
      <UsersPagination
        offset={offset}
        pageSize={USERS_PAGE_SIZE}
        total={users.data?.total}
        onOffsetChange={setOffset}
      />
    </div>
  )
}

type ActionVariables = { action: UserAction; userId: string; email: string } | undefined

function doneAction(
  isSuccess: boolean,
  variables: ActionVariables,
): { action: UserAction; email: string } | null {
  if (isSuccess === false || variables === undefined) {
    return null
  }

  return variables
}

function pendingUserId(isPending: boolean, variables: ActionVariables): string | null {
  if (isPending === false || variables === undefined) {
    return null
  }

  return variables.userId
}

function SearchField(props: { value: string; onChange: (value: string) => void }): JSX.Element {
  return (
    <div className="relative w-full sm:max-w-xs">
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
      />
      <Input
        type="search"
        aria-label="Buscar por email"
        placeholder="Buscar por email"
        className="pl-9"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  )
}

function UserCount({ total }: { total: number | undefined }): JSX.Element | null {
  if (total === undefined) {
    return null
  }

  if (total === 1) {
    return <p className="text-muted-foreground text-sm">1 usuário</p>
  }

  return <p className="text-muted-foreground text-sm">{total.toLocaleString('pt-BR')} usuários</p>
}
