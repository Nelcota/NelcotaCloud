import { Crown } from 'lucide-react'
import type { JSX } from 'react'

import { StatusBadge } from '@/shared/ui/status-badge'

/** The account's role on a project card or row; the owner keeps the crown of the transfer action. */
export function RoleBadge({ role }: { role: 'owner' | 'member' }): JSX.Element {
  if (role === 'owner') {
    return <StatusBadge icon={<Crown aria-hidden />}>Dono</StatusBadge>
  }

  return <StatusBadge>Membro</StatusBadge>
}
