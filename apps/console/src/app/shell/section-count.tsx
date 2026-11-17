import type { JSX } from 'react'

import { useUsersQuery } from '@/modules/users/queries/use-users'
import { cn } from '@/shared/lib/class-names'
import { badgeVariants } from '@/shared/ui/badge-variants'

type SectionCountProps = {
  projectId: string
  segment: string
}

/** A live count next to a sidebar item (only Usuários has one): a neutral pill, not a status. */
export function SectionCount({ projectId, segment }: SectionCountProps): JSX.Element | null {
  if (segment !== 'users') {
    return null
  }

  return <UsersCount projectId={projectId} />
}

/** The project's user total, from a one-row page so the sidebar stays cheap to load. */
function UsersCount({ projectId }: { projectId: string }): JSX.Element | null {
  const users = useUsersQuery(projectId, { email: '', offset: 0, limit: 1 })
  const total = users.data?.total

  if (total === undefined || total === 0) {
    return null
  }

  return (
    <span className={cn(badgeVariants(), 'tabular-nums')}>
      <span className="sr-only">, </span>
      {total.toLocaleString('pt-BR')}
      <span className="sr-only"> usuários</span>
    </span>
  )
}
