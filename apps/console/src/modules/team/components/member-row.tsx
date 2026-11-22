import type { JSX } from 'react'

import type { MemberListProps } from '@/modules/team/components/member-list'
import { TeamRowMenu } from '@/modules/team/components/team-row-menu'
import type { MemberRow } from '@/modules/team/components/team-rows'
import { Avatar } from '@/shared/ui/avatar'
import { IdChip } from '@/shared/ui/id-chip'
import { TableCell, TableRow } from '@/shared/ui/primitives/table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

const ROLE_BADGES = {
  owner: { label: 'Dono', tone: 'brand' },
  member: { label: 'Membro', tone: 'neutral' },
} as const

type MemberRowViewProps = { row: MemberRow; isOwnRow: boolean; list: MemberListProps }

/** One person: photo and email, role, account id, arrival and the menu. */
export function MemberRowView({ row, isOwnRow, list }: MemberRowViewProps): JSX.Element {
  const role = ROLE_BADGES[row.role]
  const viewer = {
    isOwnRow,
    canManage: list.canManage,
    isSoleOwner: row.role === 'owner' && list.ownerCount === 1,
    hasOthers: list.memberCount > 1,
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={row.email} src={photoOf(isOwnRow, list.me.photoUrl)} size="sm" />
          <PersonLabel email={row.email} isOwnRow={isOwnRow} />
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge tone={role.tone}>{role.label}</StatusBadge>
      </TableCell>
      <TableCell>
        <IdChip label="Account ID" value={row.id} className="max-w-24" />
      </TableCell>
      <TableCell className="text-muted-foreground">
        <Timestamp value={row.joinedAt} format="date" />
      </TableCell>
      <TableCell className="w-10 text-right">
        <TeamRowMenu row={row} viewer={viewer} onAction={list.onAction} />
      </TableCell>
    </TableRow>
  )
}

/** A member's email is recorded on their next console visit; until then it is unknown. */
function PersonLabel({ email, isOwnRow }: { email: string; isOwnRow: boolean }): JSX.Element {
  return (
    <span className="flex min-w-0 items-baseline gap-1.5">
      <KnownEmail email={email} />
      {isOwnRow && <span className="shrink-0 text-sm text-muted-foreground">(você)</span>}
    </span>
  )
}

function KnownEmail({ email }: { email: string }): JSX.Element {
  if (email === '') {
    return <span className="truncate text-muted-foreground">Email ainda desconhecido</span>
  }

  return (
    <span className="max-w-48 truncate font-medium text-heading" title={email}>
      {email}
    </span>
  )
}

function photoOf(isOwnRow: boolean, myPhotoUrl: string | null): string | undefined {
  if (isOwnRow && myPhotoUrl !== null) {
    return myPhotoUrl
  }

  return undefined
}
