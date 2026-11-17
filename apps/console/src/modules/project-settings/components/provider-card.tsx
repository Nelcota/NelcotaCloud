import Login from '~icons/solar/login-3-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderForm } from '@/modules/project-settings/components/provider-form'
import { ProviderLogo } from '@/modules/project-settings/components/provider-logo'
import { useRemoveProviderMutation } from '@/modules/project-settings/queries/use-oauth-providers'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime } from '@/shared/lib/format-date'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

type ConfiguredProvider = components['schemas']['ConfiguredProvider']

const PROVIDER_NAMES: Record<OAuthProviderName, string> = { google: 'Google', github: 'GitHub' }

type ProviderCardProps = {
  projectId: string
  provider: OAuthProviderName
  /** `null` when the project has no OAuth app for this provider. */
  configured: ConfiguredProvider | null
}

/** Whether login with one provider is on, with which app, and how to change or turn it off. */
export function ProviderCard({ projectId, provider, configured }: ProviderCardProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const removal = useRemoveProviderMutation({ projectId, provider })
  const providerName = PROVIDER_NAMES[provider]

  return (
    <SettingsSection
      title={providerName}
      leading={<ProviderLogo provider={provider} />}
      description={`Use o OAuth app do seu próprio ${providerName}.`}
    >
      <ProviderStatus configured={configured} />
      <ErrorAlert error={removal.error} />
      <ProviderBody
        isEditing={isEditing}
        onEdit={setIsEditing}
        projectId={projectId}
        provider={provider}
        configured={configured}
        removal={{ isPending: removal.isPending, onRemove: () => removal.mutate() }}
      />
    </SettingsSection>
  )
}

function ProviderStatus({ configured }: { configured: ConfiguredProvider | null }): JSX.Element {
  if (configured === null) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="muted">Desativado</Badge>
        <span className="text-muted-foreground">Ninguém entra com este provedor ainda.</span>
      </div>
    )
  }

  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="success">Ativo</Badge>
        <span className="text-muted-foreground">desde {formatDateTime(configured.updated_at)}</span>
      </div>
      <div className="flex min-w-0 gap-2">
        <dt className="text-muted-foreground shrink-0">Client ID</dt>
        <dd className="min-w-0 font-mono text-xs leading-5 break-all">{configured.client_id}</dd>
      </div>
    </dl>
  )
}

type ProviderBodyProps = {
  isEditing: boolean
  onEdit: (isEditing: boolean) => void
  projectId: string
  provider: OAuthProviderName
  configured: ConfiguredProvider | null
  removal: { isPending: boolean; onRemove: () => void }
}

function ProviderBody(props: ProviderBodyProps): JSX.Element {
  if (props.isEditing) {
    return (
      <ProviderForm
        projectId={props.projectId}
        provider={props.provider}
        onDone={() => props.onEdit(false)}
      />
    )
  }

  if (props.configured === null) {
    return (
      <div>
        <Button variant="outline" onClick={() => props.onEdit(true)}>
          Configurar
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => props.onEdit(true)}>
        Trocar credenciais
      </Button>
      <ConfirmButton
        title={`Desativar o login com ${PROVIDER_NAMES[props.provider]}?`}
        description="O botão deixa de funcionar no app e as credenciais são apagadas. Usuários que entravam só por ele precisarão de outro jeito de entrar."
        confirmLabel="Desativar"
        change={{
          subject: `Login com ${PROVIDER_NAMES[props.provider]}`,
          icon: Login,
          from: 'Ativo',
          to: 'Desativado',
        }}
        isDestructive
        isPending={props.removal.isPending}
        onConfirm={props.removal.onRemove}
      >
        Desativar
      </ConfirmButton>
    </div>
  )
}
