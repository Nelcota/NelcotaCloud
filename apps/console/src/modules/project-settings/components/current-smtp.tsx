import Letter from '~icons/solar/letter-linear'
import Mail from '~icons/solar/letter-linear'
import Server from '~icons/solar/server-linear'
import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { Badge } from '@/shared/ui/badge'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { Skeleton } from '@/shared/ui/skeleton'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

type CurrentSmtpProps = {
  view: SmtpSettingsView | undefined
  isResetting: boolean
  onReset: () => void
}

/** Which server sends the project's emails now, and the way back to the platform's. */
export function CurrentSmtp({ view, isResetting, onReset }: CurrentSmtpProps): JSX.Element {
  if (view === undefined) {
    return <Skeleton className="h-[4.5rem] rounded-lg" />
  }

  if (view.is_custom === false) {
    return (
      <ServerRow
        icon={<Mail className="text-muted-foreground size-5" />}
        title="SMTP da NelcotaCloud"
        detail="Funciona sem configurar nada. Para usar seu domínio no remetente, configure o seu servidor abaixo."
        badge={<Badge>Padrão</Badge>}
      />
    )
  }

  return (
    <ServerRow
      icon={<Server className="text-muted-foreground size-5" />}
      title={view.smtp_host ?? 'Servidor próprio'}
      detail={`Remetente: ${view.email_from ?? '—'}`}
      badge={<Badge>Seu servidor</Badge>}
      action={
        <ConfirmButton
          title="Voltar ao SMTP da plataforma?"
          description="Os emails passam a sair pela NelcotaCloud. As credenciais do seu servidor são apagadas."
          confirmLabel="Voltar ao padrão"
          change={{
            subject: view.smtp_host ?? 'Servidor próprio',
            icon: Letter,
            from: 'Seu servidor',
            to: 'SMTP da plataforma',
          }}
          isPending={isResetting}
          onConfirm={onReset}
        >
          Voltar ao padrão
        </ConfirmButton>
      }
    />
  )
}

type ServerRowProps = {
  icon: JSX.Element
  title: string
  detail: string
  badge: JSX.Element
  action?: JSX.Element
}

function ServerRow({ icon, title, detail, badge, action }: ServerRowProps): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center">
      <span className="bg-secondary flex size-11 shrink-0 items-center justify-center rounded-lg">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge}
        </div>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty break-words">{detail}</p>
      </div>
      {action}
    </div>
  )
}
