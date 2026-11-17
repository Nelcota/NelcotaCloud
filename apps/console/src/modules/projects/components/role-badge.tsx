import Crown from '~icons/solar/crown-minimalistic-linear'
import type { JSX } from 'react'

import { Badge } from '@/shared/ui/badge'

/** A role is what someone is, not a state: neutral, with the crown that "Tornar dono" uses. */
export function RoleBadge({ role }: { role: 'owner' | 'member' }): JSX.Element {
  if (role === 'owner') {
    return (
      <Badge>
        <Crown aria-hidden="true" />
        Dono
      </Badge>
    )
  }

  return <Badge>Membro</Badge>
}
