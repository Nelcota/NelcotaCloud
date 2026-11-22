import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import { SessionRow } from '@/modules/account/components/session-row'

type SessionListProps = {
  sessions: SessionSummary[]
  pendingId: string | null
  onRevoke: (sessionId: string) => Promise<void>
}

/** The account's sessions as dense rows. */
export function SessionList({ sessions, pendingId, onRevoke }: SessionListProps): JSX.Element {
  return (
    <ul aria-label="Sessões" className="-mx-2 grid gap-0.5">
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          isPending={pendingId === session.id}
          onRevoke={() => onRevoke(session.id)}
        />
      ))}
    </ul>
  )
}
