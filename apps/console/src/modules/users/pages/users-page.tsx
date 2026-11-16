import { Search } from 'lucide-react'
import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import { UsersTable } from '@/modules/users/components/users-table'
import { useUserActionMutation, useUsersQuery } from '@/modules/users/queries/use-users'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { Input } from '@/shared/ui/input'
import { PageHeader } from '@/shared/ui/page-header'

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const users = useUsersQuery(projectId, deferredSearch)
  const action = useUserActionMutation(projectId)

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Usuários"
        description="As contas do seu app. Bloqueie, encerre sessões ou remova o MFA de quem precisar."
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            strokeWidth={1.75}
          />
          <Input
            type="search"
            aria-label="Buscar por email"
            placeholder="Buscar por email"
            className="pl-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <UserCount total={users.data?.total} shown={users.data?.users.length} />
      </div>
      <ErrorAlert error={users.error ?? action.error} />
      <UsersTable
        users={users.data?.users}
        search={deferredSearch}
        isActionPending={action.isPending}
        onAction={(userId, kind) => action.mutate({ action: kind, userId })}
      />
    </div>
  )
}

function UserCount({
  total,
  shown,
}: {
  total: number | undefined
  shown: number | undefined
}): JSX.Element | null {
  if (total === undefined || shown === undefined) {
    return null
  }

  return (
    <p role="status" className="text-muted-foreground text-sm">
      {countLabel(total, shown)}
    </p>
  )
}

function countLabel(total: number, shown: number): string {
  const formatted = total.toLocaleString('pt-BR')

  if (total === 1) {
    return '1 usuário'
  }

  if (shown < total) {
    return `${formatted} usuários · mostrando os ${shown} mais recentes`
  }

  return `${formatted} usuários`
}
