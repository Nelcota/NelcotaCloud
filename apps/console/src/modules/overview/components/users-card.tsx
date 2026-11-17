import Users from '~icons/solar/users-group-rounded-linear'
import type { JSX } from 'react'

import { OverviewCard } from '@/modules/overview/components/overview-card'
import { LOADING_DETAIL, countOrNull } from '@/modules/overview/components/overview-metrics'
import { useSettingsQuery } from '@/modules/project-settings/queries/use-project-settings'
import { useUsersQuery } from '@/modules/users/queries/use-users'

/** One user is enough to read the total; the list itself stays on the users page. */
const TOTAL_ONLY = { email: '', offset: 0, limit: 1 }

export function UsersCard({ projectId }: { projectId: string }): JSX.Element {
  const settings = useSettingsQuery(projectId)
  const users = useUsersQuery(projectId, TOTAL_ONLY)
  const base = `/projects/${projectId}`

  return (
    <OverviewCard
      icon={Users}
      title="Usuários"
      metricLabel="Contas"
      value={countOrNull(users.data?.total)}
      error={users.error}
      onRetry={() => users.refetch()}
      detail={verificationDetail(settings.data?.require_email_verification)}
      links={[
        { label: 'Usuários', to: `${base}/users` },
        { label: 'Login social', to: `${base}/providers` },
      ]}
    />
  )
}

function verificationDetail(requiresVerification: boolean | undefined): string {
  if (requiresVerification === undefined) {
    return LOADING_DETAIL
  }

  if (requiresVerification === false) {
    return 'Login com senha sem confirmação de email'
  }

  return 'Login com senha exige email confirmado'
}
