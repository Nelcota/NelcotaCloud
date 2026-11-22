import Monitor from '~icons/solar/monitor-linear'
import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import { SessionAction } from '@/modules/account/components/session-action'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

/** The first block of the session id tells sessions apart; the whole id is on hover. */
const SHORT_ID_LENGTH = 8
const WIDE_ONLY = 'hidden md:table-cell'

type SessionsTableProps = {
  sessions: SessionSummary[]
  pendingId: string | null
  onRevoke: (sessionId: string) => Promise<void>
}

/** One row per signed-in browser: when it started, when it was last active, how to end it. */
export function SessionsTable({ sessions, pendingId, onRevoke }: SessionsTableProps): JSX.Element {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Início</TableHead>
            <TableHead>Última atividade</TableHead>
            <TableHead className={WIDE_ONLY}>Sessão</TableHead>
            <TableHead className="w-0 text-end">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                <span className="flex items-center gap-2">
                  <Monitor aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  <Timestamp value={session.started_at} />
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                <Timestamp value={session.last_refreshed_at} format="relative" />
              </TableCell>
              <TableCell className={WIDE_ONLY}>
                <SessionId session={session} />
              </TableCell>
              <TableCell className="text-end">
                <SessionAction
                  session={session}
                  isPending={pendingId === session.id}
                  onRevoke={() => onRevoke(session.id)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function SessionId({ session }: { session: SessionSummary }): JSX.Element {
  return (
    <span className="flex items-center gap-2">
      <code title={session.id} className="font-mono text-xs text-muted-foreground">
        {session.id.slice(0, SHORT_ID_LENGTH)}
      </code>
      {session.is_current && <StatusBadge tone="success">Esta sessão</StatusBadge>}
    </span>
  )
}
