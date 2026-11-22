import { Monitor } from 'lucide-react'
import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import { SessionAction } from '@/modules/account/components/session-action'
import { StatusBadge } from '@/shared/ui/status-badge'
import { Timestamp } from '@/shared/ui/timestamp'

/** The first block of the session id tells sessions apart; the whole id is on hover. */
const SHORT_ID_LENGTH = 8

type SessionRowProps = {
  session: SessionSummary
  isPending: boolean
  onRevoke: () => Promise<void>
}

/** One signed-in browser: its id, when it started, when it was last active, how to end it. */
export function SessionRow({ session, isPending, onRevoke }: SessionRowProps): JSX.Element {
  return (
    <li className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-200 hover:bg-surface">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface text-muted-foreground">
        <Monitor aria-hidden className="size-3.5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-xs font-medium text-heading">Sessão</span>
          <code title={session.id} className="font-mono text-xs text-muted-foreground">
            {session.id.slice(0, SHORT_ID_LENGTH)}
          </code>
          <CurrentPill isCurrent={session.is_current} />
        </div>
        <p className="truncate text-2xs text-muted-foreground">
          Ativa <Timestamp value={session.last_refreshed_at} format="relative" /> · entrou em{' '}
          <Timestamp value={session.started_at} />
        </p>
      </div>
      <SessionAction session={session} isPending={isPending} onRevoke={onRevoke} />
    </li>
  )
}

function CurrentPill({ isCurrent }: { isCurrent: boolean }): JSX.Element | null {
  if (isCurrent === false) {
    return null
  }

  return <StatusBadge tone="success">Esta sessão</StatusBadge>
}
