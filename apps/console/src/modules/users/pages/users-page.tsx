import type { JSX } from 'react'
import { useDeferredValue, useState } from 'react'

import { UserActions } from '@/modules/users/components/user-actions'
import { useUserActionMutation, useUsersQuery } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Badge } from '@/shared/ui/badge'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type User = components['schemas']['User']

const DATE_FORMAT = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const users = useUsersQuery(projectId, deferredSearch)
  const action = useUserActionMutation(projectId)

  return (
    <div className="grid gap-4">
      <div className="max-w-sm">
        <FormField
          label="Buscar por email"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ErrorAlert error={users.error ?? action.error} />
      <p className="text-muted-foreground text-sm">
        {users.data?.total ?? 0} usuário(s); mostrando os 50 mais recentes.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(users.data?.users ?? []).map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                <UserBadges user={user} />
              </TableCell>
              <TableCell>{DATE_FORMAT.format(new Date(user.created_at))}</TableCell>
              <TableCell>
                <UserActions
                  user={user}
                  isPending={action.isPending}
                  onAction={(kind) => action.mutate({ action: kind, userId: user.id })}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function UserBadges({ user }: { user: User }): JSX.Element {
  const badges: string[] = []

  if (user.email_verified_at === null || user.email_verified_at === undefined) {
    badges.push('não confirmado')
  }

  if (user.mfa_enabled) {
    badges.push('MFA')
  }

  if (user.banned_at !== null && user.banned_at !== undefined) {
    badges.push('bloqueado')
  }

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((badge) => (
        <Badge key={badge} variant="outline">
          {badge}
        </Badge>
      ))}
    </div>
  )
}
