import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import { RevokeOthersButton } from '@/modules/account/components/revoke-others-button'
import { SessionList } from '@/modules/account/components/session-list'
import { useRevokeSessionMutation, useSessionsQuery } from '@/modules/account/queries/use-sessions'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SettingsSection } from '@/shared/ui/settings-section'

/** Where the console account is signed in, and the way to sign the other devices out. */
export function SessionsSection(): JSX.Element {
  const sessions = useSessionsQuery()
  const revocation = useRevokeSessionMutation()

  return (
    <SettingsSection title="Sessões ativas" footer={othersFooter(sessions.data)}>
      <LoadError error={sessions.error} onRetry={() => sessions.refetch()} />
      <SessionRows
        sessions={sessionsToShow(sessions.isError, sessions.data)}
        pendingId={runningId(revocation.isPending, revocation.variables)}
        onRevoke={(sessionId) => revocation.mutateAsync(sessionId)}
      />
    </SettingsSection>
  )
}

function othersFooter(sessions: SessionSummary[] | undefined): JSX.Element | undefined {
  if (sessions?.some((session) => session.is_current === false) !== true) {
    return undefined
  }

  return <RevokeOthersButton />
}

/** `null` when the load failed: the error banner replaces the list. */
function sessionsToShow(
  isError: boolean,
  sessions: SessionSummary[] | undefined,
): SessionSummary[] | undefined | null {
  if (isError) {
    return null
  }

  return sessions
}

function runningId(isPending: boolean, sessionId: string | undefined): string | null {
  if (isPending === false || sessionId === undefined) {
    return null
  }

  return sessionId
}

type SessionRowsProps = {
  sessions: SessionSummary[] | undefined | null
  pendingId: string | null
  onRevoke: (sessionId: string) => Promise<void>
}

function SessionRows({ sessions, pendingId, onRevoke }: SessionRowsProps): JSX.Element | null {
  if (sessions === null) {
    return null
  }

  if (sessions === undefined) {
    return <Skeleton className="h-11 w-full rounded-lg" />
  }

  if (sessions.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhuma sessão ativa.</p>
  }

  return <SessionList sessions={sessions} pendingId={pendingId} onRevoke={onRevoke} />
}
