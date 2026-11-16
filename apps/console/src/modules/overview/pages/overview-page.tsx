import { ExternalLink, KeyRound, Mail, Users } from 'lucide-react'
import type { JSX } from 'react'

import { useApiKeysQuery } from '@/modules/api-keys/queries/use-api-keys'
import { ConnectAppPanel } from '@/modules/overview/components/connect-app-panel'
import { OverviewCard } from '@/modules/overview/components/overview-card'
import {
  useSettingsQuery,
  useSmtpQuery,
} from '@/modules/project-settings/queries/use-project-settings'
import { useUsersQuery } from '@/modules/users/queries/use-users'
import type { components } from '@/shared/api/api-schema'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'
import { Skeleton } from '@/shared/ui/skeleton'

type ApiKeySummary = components['schemas']['ApiKeySummary']
type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** The project at a glance, from live data only, and how to plug it into an app. */
export function OverviewPage(): JSX.Element {
  const projectId = useProjectId()
  const settings = useSettingsQuery(projectId)
  const users = useUsersQuery(projectId, '')
  const keys = useApiKeysQuery(projectId)
  const smtp = useSmtpQuery(projectId)
  const activeKeys = (keys.data ?? []).filter(isActive)
  const base = `/projects/${projectId}`

  return (
    <div className="grid gap-8">
      <PageHeader title="Visão geral" description={<SiteUrl url={settings.data?.site_url} />} />
      <div className="grid gap-4 md:grid-cols-3">
        <OverviewCard
          icon={Users}
          title="Autenticação"
          metricLabel="Usuários"
          value={countOrNull(users.data?.total)}
          detail={verificationDetail(settings.data?.require_email_verification)}
          links={[
            { label: 'Usuários', to: `${base}/users` },
            { label: 'Login social', to: `${base}/providers` },
          ]}
        />
        <OverviewCard
          icon={KeyRound}
          title="Chaves de API"
          metricLabel="Ativas"
          value={activeKeyCount(keys.data, activeKeys)}
          detail={keysDetail(keys.data, activeKeys)}
          links={[{ label: 'Chaves', to: `${base}/keys` }]}
        />
        <OverviewCard
          icon={Mail}
          title="Envio de email"
          metricLabel="Servidor"
          value={smtpServer(smtp.data)}
          detail={smtpDetail(smtp.data)}
          links={[{ label: 'Email', to: `${base}/email` }]}
        />
      </div>
      <ConnectAppPanel publishableKeyHint={publishableHint(activeKeys)} />
    </div>
  )
}

/** The app this project serves; opens in a new tab, since the console stays where it is. */
function SiteUrl({ url }: { url: string | undefined }): JSX.Element {
  if (url === undefined) {
    return <Skeleton className="h-4 w-48" />
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 transition-colors hover:underline"
    >
      {url}
      <ExternalLink className="size-3.5" strokeWidth={1.75} />
    </a>
  )
}

function isActive(key: ApiKeySummary): boolean {
  return key.revoked_at === null || key.revoked_at === undefined
}

function countOrNull(count: number | undefined): string | null {
  if (count === undefined) {
    return null
  }

  return count.toLocaleString('pt-BR')
}

function verificationDetail(requiresVerification: boolean | undefined): string {
  if (requiresVerification === undefined) {
    return LOADING_DETAIL
  }

  if (requiresVerification === false) {
    return 'Login com senha sem confirmação de email'
  }

  return 'Login com senha exige email confirmado'
}

const LOADING_DETAIL = 'Carregando…'

function keysDetail(keys: ApiKeySummary[] | undefined, activeKeys: ApiKeySummary[]): string {
  if (keys === undefined) {
    return LOADING_DETAIL
  }

  const publishable = activeKeys.filter((key) => key.kind === 'publishable').length

  return `${publishable} publishable · ${activeKeys.length - publishable} secret`
}

function publishableHint(activeKeys: ApiKeySummary[]): string | null {
  return activeKeys.find((key) => key.kind === 'publishable')?.hint ?? null
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

/** `null` until the keys arrive, so the card shows a dash rather than a false zero. */
function activeKeyCount(
  keys: ApiKeySummary[] | undefined,
  activeKeys: ApiKeySummary[],
): string | null {
  if (keys === undefined) {
    return null
  }

  return countOrNull(activeKeys.length)
}
