import type { JSX } from 'react'

import { RoleBadge } from '@/modules/projects/components/role-badge'
import type { MemberListProps } from '@/modules/team/components/member-list'
import { MemberIdentity } from '@/modules/team/components/member-identity'
import { TeamRowMenu } from '@/modules/team/components/team-row-menu'
import type { MemberRow } from '@/modules/team/components/team-rows'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type MemberRowViewProps = { row: MemberRow; isOwnRow: boolean; list: MemberListProps }

/** One person: photo, email and account id, role, arrival and the menu. */
export function MemberRowView({ row, isOwnRow, list }: MemberRowViewProps): JSX.Element {
  const viewer = {
    isOwnRow,
    canManage: list.canManage,
    isSoleOwner: row.role === 'owner' && list.ownerCount === 1,
    hasOthers: list.memberCount > 1,
  }

  return (
    <TableRow>
      <TableCell>
        <MemberIdentity row={row} isOwnRow={isOwnRow} myPhotoUrl={list.me.photoUrl} />
      </TableCell>
      <TableCell>
        <RoleBadge role={row.role} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Timestamp value={row.joinedAt} format="relative" />
      </TableCell>
      <TableCell className="sticky end-0 z-[1] bg-card text-end">
        <TeamRowMenu row={row} viewer={viewer} onAction={list.onAction} />
      </TableCell>
    </TableRow>
  )
}
