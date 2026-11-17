import { useParams } from '@tanstack/react-router'
import type { JSX } from 'react'

import { UserDetail } from '@/modules/users/components/user-detail'

export function UserDetailPage(): JSX.Element {
  const { projectId, userId } = useParams({
    from: '/_authenticated/projects/$projectId/users/$userId',
  })

  return <UserDetail projectId={projectId} userId={userId} />
}
