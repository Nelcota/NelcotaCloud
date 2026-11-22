import type { JSX } from 'react'

import { InvitationActions } from '@/modules/team/components/invitation-actions'
import { DELIVERY_LABEL } from '@/modules/team/components/invitation-delivery-copy'
import type { InvitationListProps } from '@/modules/team/components/invitation-list'
import type { InvitationRow } from '@/modules/team/components/team-rows'
import { cn } from '@/shared/lib/utils'
import { ActivityItem } from '@/shared/ui/activity-item'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

type InvitationItemProps = {
  invitation: InvitationRow
  actions: Omit<InvitationListProps, 'rows'>
}

/** One invitation: the email first, when it was sent and how the email went, then its actions. */
export function InvitationItem({ invitation, actions }: InvitationItemProps): JSX.Element {
  return (
    <li className="flex min-w-0 items-center gap-1 rounded-lg pe-2 transition-colors duration-200 hover:bg-surface">
      <ActivityItem
        className="min-w-0 flex-1"
        title={<span className="font-medium">{invitation.email}</span>}
        meta={[
          <span key="sent">
            convidado <Timestamp value={invitation.createdAt} format="relative" />
          </span>,
          <DeliveryText key="delivery" status={invitation.deliveryStatus} />,
        ]}
        status={<StatusBadge tone="warning">Pendente</StatusBadge>}
      />
      <InvitationActions invitation={invitation} {...actions} />
    </li>
  )
}

/** A failed email stands out: it is the one the owner has to act on. */
function DeliveryText({ status }: { status: InvitationRow['deliveryStatus'] }): JSX.Element {
  return (
    <span className={cn(status === 'failed' && 'font-medium text-destructive')}>
      {DELIVERY_LABEL[status]}
    </span>
  )
}
