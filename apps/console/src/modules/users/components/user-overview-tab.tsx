import type { JSX } from 'react'

import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserDangerZone } from '@/modules/users/components/user-danger-zone'
import { UserIdentitiesSection } from '@/modules/users/components/user-identities-section'
import { UserProperties } from '@/modules/users/components/user-properties'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

type UserOverviewTabProps = {
  projectId: string
  user: User
  runner: UserActionRunner
}

/** The account's facts and linked logins, then the danger zone. Metadata has its own tab. */
export function UserOverviewTab(props: UserOverviewTabProps): JSX.Element {
  const { projectId, user } = props

  return (
    <>
      <div className="flex min-w-0 flex-col gap-4">
        <UserProperties user={user} />
        <UserIdentitiesSection projectId={projectId} userId={user.id} />
      </div>
      <UserDangerZone user={user} runner={props.runner} />
    </>
  )
}
