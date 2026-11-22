import type { JSX } from 'react'

import { UserShortId } from '@/modules/users/components/user-short-id'
import type { components } from '@/shared/api/api-schema'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'
import { Timestamp } from '@/shared/ui/timestamp'

type UserSession = components['schemas']['UserSessions']['sessions'][number]

/** Each session (refresh token family): its id, when it began, was last renewed and expires. */
export function UserSessionsTable({ sessions }: { sessions: UserSession[] }): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sessão</TableHead>
          <TableHead>Último uso</TableHead>
          <TableHead>Início</TableHead>
          <TableHead className="hidden sm:table-cell">Expira</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell className="py-1">
              <UserShortId id={session.id} description="ID da sessão" />
            </TableCell>
            <TableCell>
              <Timestamp value={session.last_refreshed_at} format="relative" />
            </TableCell>
            <TableCell className="text-muted-foreground">
              <Timestamp value={session.started_at} format="relative" />
            </TableCell>
            <TableCell className="hidden text-muted-foreground sm:table-cell">
              <Timestamp value={session.expires_at} format="relative" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
