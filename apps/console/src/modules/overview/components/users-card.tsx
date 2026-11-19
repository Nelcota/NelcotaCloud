import Users from '~icons/solar/users-group-rounded-linear'
import type { JSX } from 'react'

import { OverviewCard } from '@/modules/overview/components/overview-card'
import { countOrNull } from '@/modules/overview/components/overview-metrics'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { useUserCountQuery } from '@/modules/users/queries/use-users'

export function UsersCard({ projectId }: { projectId: string }): JSX.Element {
  const project = useCurrentProject(projectId)
  const users = useUserCountQuery(projectId)

  return (
    <OverviewCard
      icon={Users}
      label="Usuários"
      value={countOrNull(users.data)}
      error={users.error}
      onRetry={() => users.refetch()}
      detail={verificationDetail(project?.require_email_verification)}
      to={`/projects/${projectId}/users`}
    />
  )
}

function verificationDetail(requiresVerification: boolean | undefined): string | null {
  if (requiresVerification === undefined) {
    return null
  }

  if (requiresVerification === false) {
    return 'Login com senha sem confirmação de email'
  }

  return 'Login com senha exige email confirmado'
}
