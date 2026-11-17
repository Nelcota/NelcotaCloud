import type { JSX } from 'react'

import { UsersBrowser } from '@/modules/users/components/users-browser'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function UsersPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Usuários"
        description="As contas do seu app. Bloqueie, encerre sessões ou remova o MFA de quem precisar."
      />
      <UsersBrowser projectId={projectId} />
    </div>
  )
}
