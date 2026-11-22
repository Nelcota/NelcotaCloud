import type { JSX } from 'react'

import { userSnippets } from '@/modules/users/components/user-api-snippets'
import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { userAvatarUrl } from '@/modules/users/components/user-avatar-url'
import { UserDetailActions } from '@/modules/users/components/user-detail-actions'
import { UserHeaderFacts } from '@/modules/users/components/user-header-facts'
import { useAvatarKey } from '@/modules/users/queries/use-avatar-key'
import type { components } from '@/shared/api/api-schema'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { Avatar } from '@/shared/ui/avatar'
import { PageHeader } from '@/shared/ui/page-header'

type User = components['schemas']['User']

type UserDetailHeaderProps = { projectId: string; user: User; runner: UserActionRunner }

/** The user's photo and email, with the short id and states under it and the actions aside. */
export function UserDetailHeader({ projectId, user, runner }: UserDetailHeaderProps): JSX.Element {
  const avatarKey = useAvatarKey(projectId)

  return (
    <PageHeader
      title={user.email}
      leading={
        <Avatar name={user.email} src={userAvatarUrl(user, avatarKey) ?? undefined} size="lg" />
      }
      description={<UserHeaderFacts user={user} />}
      actions={
        <>
          <UserDetailActions user={user} runner={runner} />
          <ApiSheet
            title="Usuário pela API"
            description="Rotas de administração com a chave secreta, só no servidor; o próprio usuário usa o SDK."
            snippets={userSnippets(user)}
          />
        </>
      }
    />
  )
}
