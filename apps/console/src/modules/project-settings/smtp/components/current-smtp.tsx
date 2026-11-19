import Letter from '~icons/solar/letter-linear'
import Server from '~icons/solar/server-linear'
import type { JSX } from 'react'

import { ResetSmtpButton } from '@/modules/project-settings/smtp/components/reset-smtp-button'
import { SmtpServerRow } from '@/modules/project-settings/smtp/components/smtp-server-row'
import { SmtpSetupDialog } from '@/modules/project-settings/smtp/components/smtp-setup-dialog'
import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

type CurrentSmtpProps = {
  projectId: string
  /** `undefined` while loading. */
  view: SmtpSettingsView | undefined
  /** The load failed: the page shows the error and its retry, so this shows nothing. */
  hasFailed: boolean
}

/** Which server sends the project's emails now, and how to switch to the other kind. */
export function CurrentSmtp({ projectId, view, hasFailed }: CurrentSmtpProps): JSX.Element | null {
  if (view === undefined && hasFailed) {
    return null
  }

  if (view === undefined) {
    return <Skeleton className="h-[4.5rem] rounded-lg" />
  }

  if (view.is_custom === false) {
    return (
      <SmtpServerRow
        icon={<Letter className="size-5" />}
        title="SMTP da Nelcota"
        detail="Funciona sem configurar nada. Para enviar com o seu domínio, use o seu servidor."
        badge={<Badge>Padrão</Badge>}
        actions={
          // A fragment in both branches keeps the setup dialog mounted when saving switches them.
          <>
            <SmtpSetupDialog
              projectId={projectId}
              triggerLabel="Usar meu servidor SMTP"
              triggerVariant="default"
            />
          </>
        }
      />
    )
  }

  const serverName = serverNameOf(view)

  return (
    <SmtpServerRow
      icon={<Server className="size-5" />}
      title={serverName}
      detail={`Remetente: ${view.email_from ?? '—'}`}
      badge={<Badge>Seu servidor</Badge>}
      actions={
        <>
          <SmtpSetupDialog
            projectId={projectId}
            triggerLabel="Trocar servidor"
            triggerVariant="outline"
          />
          <ResetSmtpButton projectId={projectId} serverName={serverName} />
        </>
      }
    />
  )
}

function serverNameOf(view: SmtpSettingsView): string {
  const host = view.smtp_host

  if (host === null || host === undefined) {
    return 'Servidor próprio'
  }

  if (view.smtp_port === null || view.smtp_port === undefined) {
    return host
  }

  return `${host}:${view.smtp_port}`
}
