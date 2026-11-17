import Mail from '~icons/solar/letter-linear'
import type { JSX } from 'react'

import { OverviewCard } from '@/modules/overview/components/overview-card'
import { LOADING_DETAIL } from '@/modules/overview/components/overview-metrics'
import { useSmtpQuery } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

export function SmtpCard({ projectId }: { projectId: string }): JSX.Element {
  const smtp = useSmtpQuery(projectId)

  return (
    <OverviewCard
      icon={Mail}
      title="Envio de email"
      metricLabel="Servidor"
      value={smtpServer(smtp.data)}
      error={smtp.error}
      onRetry={() => smtp.refetch()}
      detail={smtpDetail(smtp.data)}
      links={[{ label: 'Email', to: `/projects/${projectId}/email` }]}
    />
  )
}

function smtpServer(view: SmtpSettingsView | undefined): string | null {
  if (view === undefined) {
    return null
  }

  if (view.is_custom === false) {
    return 'Plataforma'
  }

  return view.smtp_host ?? null
}

function smtpDetail(view: SmtpSettingsView | undefined): string {
  if (view === undefined) {
    return LOADING_DETAIL
  }

  if (view.is_custom === false) {
    return 'Emails saem pelo SMTP da NelcotaCloud'
  }

  return `Remetente: ${view.email_from ?? ''}`
}
