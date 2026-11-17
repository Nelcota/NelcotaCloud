import CheckCircle from '~icons/solar/check-circle-linear'
import ForbiddenCircle from '~icons/solar/forbidden-circle-linear'
import type { JSX } from 'react'

import { Badge } from '@/shared/ui/badge'

export function KeyStatusBadge({ isRevoked }: { isRevoked: boolean }): JSX.Element {
  if (isRevoked) {
    return (
      <Badge variant="muted">
        <ForbiddenCircle aria-hidden="true" />
        Revogada
      </Badge>
    )
  }

  return (
    <Badge variant="success">
      <CheckCircle aria-hidden="true" />
      Ativa
    </Badge>
  )
}
