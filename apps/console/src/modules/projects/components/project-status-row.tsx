import { Eye, Users, Crown } from 'lucide-react'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'

type ProjectStatusRowProps = { role: components['schemas']['ProjectRole'] }

/** A listed project is provisioned and serving; the right side says how the account takes part. */
export function ProjectStatusRow({ role }: ProjectStatusRowProps): JSX.Element {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 font-medium text-success">
        <span aria-hidden className="size-1.5 rounded-full bg-success" />
        Ativo
      </span>
      <RoleMark role={role} />
    </>
  )
}

function RoleMark({ role }: ProjectStatusRowProps): JSX.Element {
  if (role === 'viewer') {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Eye aria-hidden className="size-4" />
        Leitura
      </span>
    )
  }

  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Crown aria-hidden className="size-4" />
        Dono
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Users aria-hidden className="size-4" />
      Membro
    </span>
  )
}
