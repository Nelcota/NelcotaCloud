import Monitor from '~icons/solar/monitor-linear'
import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import {
  useRevokeOtherSessionsMutation,
  useRevokeSessionMutation,
  useSessionsQuery,
} from '@/modules/account/queries/use-sessions'
import { formatDateTime } from '@/shared/lib/format-date'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

/** Where the console account is signed in, and the way to sign the other devices out. */
export function SessionsSection(): JSX.Element {
  const sessions = useSessionsQuery()
  const revocation = useRevokeSessionMutation()
  const othersRevocation = useRevokeOtherSessionsMutation()

  return (
    <SettingsSection
      title="Sessões"
      description="Os navegadores onde sua conta do console está aberta."
      footer={
        <ConfirmButton
          title="Sair dos outros dispositivos?"
          description="Todas as sessões terminam, menos esta. Quem estiver usando sua conta em outro lugar precisa entrar de novo."
          confirmLabel="Sair dos outros"
          change={{
            subject: 'Outros dispositivos',
            icon: Monitor,
            from: 'Conectados',
            to: 'Desconectados',
          }}
          isDestructive
          isPending={othersRevocation.isPending}
          onConfirm={() => othersRevocation.mutateAsync()}
        >
          Sair dos outros dispositivos
        </ConfirmButton>
      }
    >
      <ErrorAlert error={sessions.error} />
      <SessionList
        sessions={sessions.data}
        pendingId={runningId(revocation.isPending, revocation.variables)}
        onRevoke={(sessionId) => revocation.mutateAsync(sessionId)}
      />
    </SettingsSection>
  )
}

function runningId(isPending: boolean, sessionId: string | undefined): string | null {
  if (isPending === false || sessionId === undefined) {
    return null
  }

  return sessionId
}

type SessionListProps = {
  sessions: SessionSummary[] | undefined
  pendingId: string | null
  onRevoke: (sessionId: string) => Promise<void>
}

function SessionList({ sessions, pendingId, onRevoke }: SessionListProps): JSX.Element {
  if (sessions === undefined) {
    return <Skeleton className="h-24 rounded-lg" />
  }

  return (
    <ul className="divide-y rounded-lg border">
      {sessions.map((session) => (
        <li key={session.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            <p className="font-medium">Entrou em {formatDateTime(session.started_at)}</p>
            <p className="text-muted-foreground">
              Ativa pela última vez em {formatDateTime(session.last_refreshed_at)}
            </p>
          </div>
          <SessionAction
            session={session}
            isPending={pendingId === session.id}
            onRevoke={() => onRevoke(session.id)}
          />
        </li>
      ))}
    </ul>
  )
}

type SessionActionProps = {
  session: SessionSummary
  isPending: boolean
  onRevoke: () => Promise<void>
}

function SessionAction({ session, isPending, onRevoke }: SessionActionProps): JSX.Element {
  if (session.is_current) {
    return <Badge>Esta sessão</Badge>
  }

  return (
    <ConfirmButton
      title="Encerrar esta sessão?"
      description="O navegador dela precisa entrar de novo para usar o console."
      confirmLabel="Encerrar"
      change={{
        subject: `Entrou em ${formatDateTime(session.started_at)}`,
        icon: Monitor,
        from: 'Ativa',
        to: 'Encerrada',
      }}
      isDestructive
      isPending={isPending}
      onConfirm={onRevoke}
    >
      Encerrar
    </ConfirmButton>
  )
}
