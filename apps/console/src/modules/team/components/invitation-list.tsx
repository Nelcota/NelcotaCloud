import type { JSX } from 'react'

import { InvitationItem } from '@/modules/team/components/invitation-item'
import type { InvitationRow } from '@/modules/team/components/team-rows'

export type InvitationListProps = {
  rows: InvitationRow[]
  canManage: boolean
  onCancel: (invitation: InvitationRow) => Promise<void>
  onResend: (invitation: InvitationRow) => Promise<void>
}

/** Invitations nobody answered yet, newest first, as a feed; owners act right from the row. */
export function InvitationList({ rows, ...actions }: InvitationListProps): JSX.Element {
  return (
    <ul className="flex flex-col gap-0.5 p-1">
      {rows.map((invitation) => (
        <InvitationItem key={invitation.id} invitation={invitation} actions={actions} />
      ))}
    </ul>
  )
}
