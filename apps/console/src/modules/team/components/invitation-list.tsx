import type { JSX } from 'react'

import { InvitationActions } from '@/modules/team/components/invitation-actions'
import { InvitationDeliveryText } from '@/modules/team/components/invitation-delivery-text'
import type { InvitationRow } from '@/modules/team/components/team-rows'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

const COLUMNS = ['Email', 'Enviado', 'Entrega']

export type InvitationListProps = {
  rows: InvitationRow[]
  canManage: boolean
  onCancel: (invitation: InvitationRow) => Promise<void>
  onResend: (invitation: InvitationRow) => Promise<void>
}

/** Invitations nobody answered yet; owners resend or cancel them right from the row. */
export function InvitationList({ rows, ...actions }: InvitationListProps): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {COLUMNS.map((column) => (
            <TableHead key={column}>{column}</TableHead>
          ))}
          <TableHead>
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell>
              <span className="block max-w-64 truncate font-medium" title={invitation.email}>
                {invitation.email}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Timestamp value={invitation.createdAt} format="date_time" />
            </TableCell>
            <TableCell>
              <InvitationDeliveryText status={invitation.deliveryStatus} />
            </TableCell>
            <TableCell className="w-20 text-right">
              <InvitationActions invitation={invitation} {...actions} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
