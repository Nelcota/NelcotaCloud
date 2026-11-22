import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { CopyButton } from '@/shared/ui/copy-button'
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

/** Enough of the family id to tell sessions apart; the copy carries all of it. */
const SHORT_LENGTH = 8

/** Each session (refresh token family): its id, when it began, was last renewed and expires. */
export function UserSessionsTable({ sessions }: { sessions: UserSession[] }): JSX.Element {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-9">Sessão</TableHead>
          <TableHead className="h-9">Criada em</TableHead>
          <TableHead className="h-9">Último uso</TableHead>
          <TableHead className="hidden h-9 sm:table-cell">Expira em</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map((session) => (
          <TableRow key={session.id}>
            <TableCell className="py-1">
              <span className="inline-flex items-center gap-0.5">
                <code title={session.id} className="font-mono text-xs text-muted-foreground">
                  {session.id.slice(0, SHORT_LENGTH)}
                </code>
                <CopyButton value={session.id} description="ID da sessão" isIconOnly />
              </span>
            </TableCell>
            <TableCell className="py-2">
              <Timestamp value={session.started_at} />
            </TableCell>
            <TableCell className="py-2 text-muted-foreground">
              <Timestamp value={session.last_refreshed_at} format="relative" />
            </TableCell>
            <TableCell className="hidden py-2 text-muted-foreground sm:table-cell">
              <Timestamp value={session.expires_at} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
