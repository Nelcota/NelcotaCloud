import type { JSX } from 'react'

import { TotpDisableForm } from '@/modules/account/components/totp-disable-form'
import { TotpEnrollment } from '@/modules/account/components/totp-enrollment'
import { useMfaStatusQuery } from '@/modules/account/queries/use-mfa'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/primitives/skeleton'
import { SettingsSection } from '@/shared/ui/settings-section'
import { StatusBadge } from '@/shared/ui/status-badge'

/** A second factor for the console account, which holds the keys of every project it manages. */
export function MfaSection(): JSX.Element {
  const status = useMfaStatusQuery()

  return (
    <SettingsSection
      title="Verificação em duas etapas (MFA)"
      description="Um código do celular a cada login."
    >
      <LoadError error={status.error} onRetry={() => status.refetch()} />
      <MfaBody isFailed={status.isError} isEnabled={status.data?.totp_enabled} />
    </SettingsSection>
  )
}

type MfaBodyProps = { isFailed: boolean; isEnabled: boolean | undefined }

function MfaBody({ isFailed, isEnabled }: MfaBodyProps): JSX.Element | null {
  if (isFailed) {
    return null
  }

  if (isEnabled === undefined) {
    return <Skeleton className="h-11 w-full rounded-lg" />
  }

  if (isEnabled) {
    return (
      <MfaState
        badge={<StatusBadge tone="success">Ativa</StatusBadge>}
        text="Seus logins pedem um código do autenticador."
        action={<TotpDisableForm />}
      />
    )
  }

  return (
    <>
      <MfaState
        badge={<StatusBadge tone="warning">Desativada</StatusBadge>}
        text="Só a senha protege sua conta hoje."
      />
      <TotpEnrollment />
    </>
  )
}

type MfaStateProps = { badge: JSX.Element; text: string; action?: JSX.Element }

/** The factor's current state as one row, with the action that changes it. */
function MfaState({ badge, text, action }: MfaStateProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface px-3 py-2.5">
      {badge}
      <span className="min-w-0 flex-1 text-xs text-muted-foreground">{text}</span>
      {action}
    </div>
  )
}
