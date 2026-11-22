import type { JSX } from 'react'

import { usersSnippets } from '@/modules/users/components/users-api-snippets'
import { UsersBrowser } from '@/modules/users/components/users-browser'
import { UsersSummary } from '@/modules/users/components/users-summary'
import { useAvatarKey } from '@/modules/users/queries/use-avatar-key'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { PageHeader } from '@/shared/ui/page-header'

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()
  const publishableKey = useAvatarKey(projectId)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuários"
        description="As contas do seu app: como entram, situação e último login."
        actions={
          <ApiSheet
            title="Usuários pela API"
            description="Listar e ler usuários usa a chave secreta, só no servidor; o cadastro usa o SDK no app."
            snippets={usersSnippets(publishableKey)}
          />
        }
      />
      <UsersSummary projectId={projectId} />
      <UsersBrowser key={projectId} projectId={projectId} />
    </div>
  )
}
