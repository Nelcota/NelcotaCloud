import type { JSX } from 'react'

import { MetadataPanel } from '@/modules/users/components/metadata-panel'
import type { components } from '@/shared/api/api-schema'

type User = components['schemas']['User']

type UserMetadataSectionProps = { projectId: string; user: User }

/**
 * Both JSON documents of a user, each saved on its own: saving one never sends the other, so a
 * change the user made meanwhile (through the SDK) is not overwritten.
 */
export function UserMetadataSection({ projectId, user }: UserMetadataSectionProps): JSX.Element {
  return (
    <div className="grid items-stretch gap-4 xl:grid-cols-2">
      <MetadataPanel
        key={`app-${user.id}`}
        projectId={projectId}
        user={user}
        document="app_metadata"
      />
      <MetadataPanel
        key={`user-${user.id}`}
        projectId={projectId}
        user={user}
        document="user_metadata"
      />
    </div>
  )
}
