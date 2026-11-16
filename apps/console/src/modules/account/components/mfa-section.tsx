import type { JSX } from 'react'

import { TotpDisableForm } from '@/modules/account/components/totp-disable-form'
import { TotpEnrollment } from '@/modules/account/components/totp-enrollment'
import { useMfaStatusQuery } from '@/modules/account/queries/use-mfa'
import { Badge } from '@/shared/ui/badge'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

/** A second factor for the console account, which holds the keys of every project it manages. */
export function MfaSection(): JSX.Element {
  const status = useMfaStatusQuery()

  return (
    <SettingsSection
      title="Verificação em duas etapas (MFA)"
      description="Pede um código do seu celular a cada login. Protege todos os projetos que você gerencia."
    >
      <ErrorAlert error={status.error} />
      <MfaBody isEnabled={status.data?.totp_enabled} />
    </SettingsSection>
  )
}

function MfaBody({ isEnabled }: { isEnabled: boolean | undefined }): JSX.Element {
  if (isEnabled === undefined) {
    return <Skeleton className="h-9 w-32" />
  }

  if (isEnabled) {
    return (
      <>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="success">Ativo</Badge>
          <span className="text-muted-foreground">
            Seus logins pedem um código do autenticador.
          </span>
        </div>
        <TotpDisableForm />
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="warning">Desativado</Badge>
        <span className="text-muted-foreground">Só a senha protege sua conta hoje.</span>
      </div>
      <TotpEnrollment />
    </>
  )
}
