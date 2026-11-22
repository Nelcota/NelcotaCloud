import type { JSX } from 'react'

import type { UserActionRunner } from '@/modules/users/components/user-action-runner'
import { UserDangerZone } from '@/modules/users/components/user-danger-zone'
import { UserIdentitiesSection } from '@/modules/users/components/user-identities-section'
import { UserMetadataPreview } from '@/modules/users/components/user-metadata-preview'
import { UserProperties } from '@/modules/users/components/user-properties'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

type UserOverviewTabProps = {
  projectId: string
  user: User
  runner: UserActionRunner
  /** Opens the Metadados tab, where the documents are edited. */
  onEditMetadata: () => void
}

/** The account's facts and linked logins, the stored metadata aside, and the danger zone last. */
export function UserOverviewTab(props: UserOverviewTabProps): JSX.Element {
  const { projectId, user } = props

  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <UserProperties user={user} />
          <UserIdentitiesSection projectId={projectId} userId={user.id} />
        </div>
        <UserMetadataPreview user={user} onEdit={props.onEditMetadata} />
      </div>
      <UserDangerZone user={user} runner={props.runner} />
    </>
  )
}
