import Crown from '~icons/solar/crown-minimalistic-linear'
import Eye from '~icons/solar/eye-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'

type ProjectRole = components['schemas']['ProjectRole']

/** A role is what someone is, not a state: neutral, with the icon its menu action uses. */
export function RoleBadge({ role }: { role: ProjectRole }): JSX.Element {
  if (role === 'owner') {
    return (
      <Badge>
        <Crown aria-hidden="true" />
        Dono
      </Badge>
    )
  }

  if (role === 'viewer') {
    return (
      <Badge>
        <Eye aria-hidden="true" />
        Leitura
      </Badge>
    )
  }

  return <Badge>Membro</Badge>
}
