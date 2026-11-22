import Crown from '~icons/solar/crown-minimalistic-linear'
import type { JSX } from 'react'

/**
 * The owner uses the same crown as the transfer action.
 */
export function RoleLabel({ role }: { role: 'owner' | 'member' }): JSX.Element {
  if (role === 'owner') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Crown aria-hidden className="size-4" />
        Dono
      </span>
    )
  }

  return <span className="text-xs text-muted-foreground">Membro</span>
}
