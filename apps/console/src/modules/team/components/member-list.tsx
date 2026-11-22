import type { JSX } from 'react'

import type { ActionTarget } from '@/modules/team/components/action-target'
import { MemberRowView } from '@/modules/team/components/member-row'
import type { MemberAction } from '@/modules/team/components/team-row-actions'
import type { MemberRow } from '@/modules/team/components/team-rows'
import type { CurrentAccount } from '@/shared/auth/use-current-account'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/primitives/table'

const COLUMNS = ['Pessoa', 'Papel', 'Account ID', 'Entrou em']

export type MemberListProps = {
  rows: MemberRow[]
  me: CurrentAccount
  canManage: boolean
  ownerCount: number
  /** People with access, to tell a lone owner whether anyone could take over. */
  memberCount: number
  onAction: (target: ActionTarget, action: MemberAction) => Promise<void>
}

/** Who has access, one row per person, owners first. */
export function MemberList(props: MemberListProps): JSX.Element {
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
        {props.rows.map((row) => (
          <MemberRowView key={row.id} row={row} isOwnRow={row.id === props.me.id} list={props} />
        ))}
      </TableBody>
    </Table>
  )
}
