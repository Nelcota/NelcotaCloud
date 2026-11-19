import type { JSX } from 'react'

import { DetailRow } from '@/modules/users/components/detail-row'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'

type User = components['schemas']['User']

type UserEmailRowProps = { user: User; projectId: string }

/**
 * Whether the email is confirmed and, when it is not, what that means for logging in under this
 * project's rule: the question support is asked ("my user can't log in").
 */
export function UserEmailRow({ user, projectId }: UserEmailRowProps): JSX.Element {
  const verifiedAt = user.email_verified_at
  const project = useCurrentProject(projectId)

  if (verifiedAt !== null && verifiedAt !== undefined) {
    return <DetailRow label="Email">Confirmado em {formatDateTime(verifiedAt)}</DetailRow>
  }

  return (
    <DetailRow label="Email">
      Não confirmado
      <LoginConsequence requiresVerification={project?.require_email_verification} />
    </DetailRow>
  )
}

type LoginConsequenceProps = { requiresVerification: boolean | undefined }

function LoginConsequence({ requiresVerification }: LoginConsequenceProps): JSX.Element | null {
  if (requiresVerification === undefined) {
    return null
  }

  if (requiresVerification === false) {
    return (
      <span className="text-muted-foreground block font-normal">
        O projeto permite login com senha mesmo assim.
      </span>
    )
  }

  return (
    <span className="text-muted-foreground block font-normal">
      Não consegue entrar com senha até confirmar.
    </span>
  )
}
