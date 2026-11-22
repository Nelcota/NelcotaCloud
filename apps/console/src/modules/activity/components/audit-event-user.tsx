import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { RouterLink } from '@/shared/routing/router-link'

type AuditEvent = components['schemas']['AuditEvent']

type AuditEventUserProps = { event: AuditEvent; projectId: string }

/** The account the event is about, linked to its page while it still exists. */
export function AuditEventUser({ event, projectId }: AuditEventUserProps): JSX.Element | null {
  const email = event.email ?? null
  const userId = event.user_id ?? null

  if (email === null) {
    return null
  }

  if (userId === null) {
    return <span className="block max-w-64 truncate">{email}</span>
  }

  return (
    <RouterLink
      href={`/projects/${projectId}/users/${userId}`}
      className="block max-w-64 truncate rounded-sm hover:text-foreground hover:underline"
    >
      {email}
    </RouterLink>
  )
}
