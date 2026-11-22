import type { JSX } from 'react'

import { userSnippets } from '@/modules/users/components/user-api-snippets'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { userAvatarUrl } from '@/modules/users/components/user-avatar-url'
import { UserDetailActions } from '@/modules/users/components/user-detail-actions'
import { UserStatusBadges } from '@/modules/users/components/user-status-badges'
import { useAvatarKey } from '@/modules/users/queries/use-avatar-key'
import type { components } from '@/shared/api/api-schema'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { Avatar } from '@/shared/ui/avatar'
import { IdChip } from '@/shared/ui/id-chip'

type User = components['schemas']['User']

type UserDetailHeaderProps = { projectId: string; user: User; runner: UserActionRunner }

/**
 * The user's photo, email, states and id, with the account actions on the right. The email is a
 * step smaller than a page title: it can be long, and it names a record, not a section.
 */
export function UserDetailHeader({ projectId, user, runner }: UserDetailHeaderProps): JSX.Element {
  const avatarKey = useAvatarKey(projectId)

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar name={user.email} src={userAvatarUrl(user, avatarKey) ?? undefined} size="lg" />
        <div className="grid min-w-0 gap-2">
          <h1 className="text-2xl font-semibold tracking-tight wrap-anywhere">{user.email}</h1>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <UserStatusBadges user={user} showsConfirmed />
            <IdChip label="ID" value={user.id} isLabelVisible />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <UserDetailActions user={user} runner={runner} />
        <ApiSheet
          title="Usuário pela API"
          description="Rotas de administração com a chave secreta, só no servidor; o próprio usuário usa o SDK."
          snippets={userSnippets(user)}
        />
      </div>
    </header>
  )
}
