import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { nelcota } from '../lib/nelcota'
import { useAction } from '../lib/use-action'
import { Card } from './card'
import { FormFeedback } from './form-feedback'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export function SessionsSection(): JSX.Element {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const { isPending, error, run } = useAction()

  const reload = useCallback(async (): Promise<void> => {
    await run(async () => {
      setSessions(await nelcota.auth.sessions.list())
    })
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  function revoke(sessionId: string): void {
    void run(async () => {
      await nelcota.auth.sessions.revoke(sessionId)
      setSessions(await nelcota.auth.sessions.list())
    })
  }

  function revokeOthers(): void {
    void run(async () => {
      await nelcota.auth.sessions.revokeOthers()
      setSessions(await nelcota.auth.sessions.list())
    })
  }

  return (
    <Card title="Sessões">
      <ul className="sessions">
        {sessions.map((session) => (
          <SessionItem key={session.id} session={session} onRevoke={revoke} />
        ))}
      </ul>
      <FormFeedback error={error} />
      <button className="secondary" disabled={isPending} onClick={revokeOthers}>
        Encerrar as outras sessões
      </button>
    </Card>
  )
}

type SessionItemProps = { session: SessionSummary; onRevoke: (sessionId: string) => void }

function SessionItem({ session, onRevoke }: SessionItemProps): JSX.Element {
  const startedAt = formatDate(session.started_at)

  if (session.is_current) {
    return <li>Iniciada em {startedAt} (esta sessão)</li>
  }

  return (
    <li>
      Iniciada em {startedAt}
      <button className="link" onClick={() => onRevoke(session.id)}>
        Encerrar
      </button>
    </li>
  )
}

/** An unreadable date would make `Intl.DateTimeFormat.format` throw and break the list. */
function formatDate(value: string): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return dateFormat.format(date)
}
