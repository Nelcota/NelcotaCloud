import { Crown, Eye } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type ProjectRole = components['schemas']['ProjectRole']

/**
 * The owner uses the same crown as the transfer action; viewers the eye of read-only access.
 */
export function RoleLabel({ role }: { role: ProjectRole }): JSX.Element {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Crown aria-hidden className="size-5" />
        Dono
      </span>
    )
  }

  if (role === 'viewer') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Eye aria-hidden className="size-5" />
        Leitura
      </span>
    )
  }

  return <span className="text-xs text-muted-foreground">Membro</span>
}
