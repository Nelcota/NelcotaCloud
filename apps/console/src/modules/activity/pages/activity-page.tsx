import type { JSX } from 'react'

import { ActivityFeed } from '@/modules/activity/components/activity-feed'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'

export function ActivityPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Atividade"
        description="Logins, tentativas recusadas e ações de administradores dos últimos 90 dias."
      />
      <ActivityFeed projectId={projectId} />
    </div>
  )
}
