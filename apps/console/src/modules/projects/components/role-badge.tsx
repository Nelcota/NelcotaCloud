import { Crown, Eye } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { StatusBadge } from '@/shared/ui/status-badge'

type ProjectRole = components['schemas']['ProjectRole']

/** The account's role on a project card or row; the owner keeps the crown of the transfer action. */
export function RoleBadge({ role }: { role: ProjectRole }): JSX.Element {
  if (role === 'owner') {
    return <StatusBadge icon={<Crown aria-hidden />}>Dono</StatusBadge>
  }

  if (role === 'viewer') {
    return <StatusBadge icon={<Eye aria-hidden />}>Leitura</StatusBadge>
  }

  return <StatusBadge>Membro</StatusBadge>
}
