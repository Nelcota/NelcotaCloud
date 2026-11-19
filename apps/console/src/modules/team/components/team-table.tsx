import type { JSX } from 'react'

import { BreakableEmail } from '@/modules/team/components/breakable-email'
import { RoleBadge } from '@/modules/projects/components/role-badge'
import type { MemberAction } from '@/modules/team/components/team-row-actions'
import { TeamRowMenu } from '@/modules/team/components/team-row-menu'
import type { MemberRow } from '@/modules/team/components/team-rows'
import type { ActionTarget } from '@/modules/team/components/action-target'
import type { CurrentAccount } from '@/shared/auth/use-current-account'
import { formatDate } from '@/shared/lib/format-date'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { UserAvatar } from '@/shared/ui/user-avatar'

const HEAD = 'h-11 px-4'
const CELL = 'px-4 py-4'
const ROLE_NAMES = { owner: 'Dono', member: 'Membro' }

type TeamTableProps = {
  rows: MemberRow[]
  me: CurrentAccount
  canManage: boolean
  ownerCount: number
  /** People with access, to tell a lone owner whether anyone could take over. */
  memberCount: number
  onAction: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/** Who has access. Below `xl` the role and date move under the email, so it stays readable. */
export function TeamTable(props: TeamTableProps): JSX.Element {
  return (
    <div className="surface overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={`${HEAD} sm:px-5`}>Pessoa</TableHead>
            <TableHead className={`${HEAD} hidden xl:table-cell`}>Papel</TableHead>
            <TableHead className={`${HEAD} hidden xl:table-cell`}>Entrou em</TableHead>
            <TableHead className={`${HEAD} w-14 sm:px-5`}>
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows.map((row) => (
            <MemberLine key={row.id} {...props} row={row} isOwnRow={row.id === props.me.id} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

type MemberLineProps = TeamTableProps & { row: MemberRow; isOwnRow: boolean }

function MemberLine(props: MemberLineProps): JSX.Element {
  const { row, isOwnRow } = props

  return (
    <TableRow>
      {/* `w-full max-w-0` lets the email take the free width and wrap inside it. */}
      <TableCell className={`${CELL} w-full max-w-0 whitespace-normal sm:px-5`}>
        <Person row={row} isOwnRow={isOwnRow} myPhotoUrl={props.me.photoUrl} />
      </TableCell>
      <TableCell className={`${CELL} hidden xl:table-cell`}>
        <RoleBadge role={row.role} />
      </TableCell>
      <TableCell className={`${CELL} text-muted-foreground hidden xl:table-cell`}>
        {formatDate(row.joinedAt)}
      </TableCell>
      <TableCell className={`${CELL} text-right sm:px-5`}>
        <TeamRowMenu
          row={row}
          viewer={{
            isOwnRow,
            canManage: props.canManage,
            isSoleOwner: row.role === 'owner' && props.ownerCount === 1,
            hasOthers: props.memberCount > 1,
          }}
          onAction={props.onAction}
        />
      </TableCell>
    </TableRow>
  )
}

type PersonProps = { row: MemberRow; isOwnRow: boolean; myPhotoUrl: string | null }

function Person({ row, isOwnRow, myPhotoUrl }: PersonProps): JSX.Element {
  return (
    <span className="flex items-center gap-3">
      <UserAvatar
        email={row.email}
        photoUrl={photoOf(isOwnRow, myPhotoUrl)}
        tone="neutral"
        className="size-10 text-sm"
      />
      <span className="grid min-w-0 gap-0.5">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <EmailText email={row.email} />
          <YouMark isOwnRow={isOwnRow} />
        </span>
        <span className="text-muted-foreground text-sm xl:hidden">
          {ROLE_NAMES[row.role]} · Entrou em {formatDate(row.joinedAt)}
        </span>
      </span>
    </span>
  )
}

/** A member's email is recorded on their next console visit; until then it is unknown. */
function EmailText({ email }: { email: string }): JSX.Element {
  if (email === '') {
    return <span className="text-muted-foreground">Email ainda desconhecido</span>
  }

  return <BreakableEmail email={email} />
}

function YouMark({ isOwnRow }: { isOwnRow: boolean }): JSX.Element | null {
  if (isOwnRow === false) {
    return null
  }

  return <span className="text-muted-foreground shrink-0 text-sm">(você)</span>
}

function photoOf(isOwnRow: boolean, myPhotoUrl: string | null): string | null {
  if (isOwnRow) {
    return myPhotoUrl
  }

  return null
}
