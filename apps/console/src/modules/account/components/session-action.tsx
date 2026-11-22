import Monitor from '~icons/solar/monitor-linear'
import type { SessionSummary } from '@nelcota/sdk'
import type { JSX } from 'react'

import { formatDateTime } from '@/shared/lib/format-date'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { StatusBadge } from '@/shared/ui/status-badge'

type SessionActionProps = {
  session: SessionSummary
  isPending: boolean
  onRevoke: () => Promise<void>
}

/** Ends another session; this browser's own row says so instead (signing out lives in the menu). */
export function SessionAction({ session, isPending, onRevoke }: SessionActionProps): JSX.Element {
  if (session.is_current) {
    return (
      <span className="md:hidden">
        <StatusBadge tone="success">Esta sessão</StatusBadge>
      </span>
    )
  }

  return (
    <ConfirmButton
      label="Encerrar"
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
    />
  )
}
