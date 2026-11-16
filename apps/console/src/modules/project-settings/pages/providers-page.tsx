import type { JSX } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { ProviderForm } from '@/modules/project-settings/components/provider-form'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { useProjectId } from '@/shared/routing/use-project-id'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsSection } from '@/shared/ui/settings-section'

const CALLBACK_PATH = '/auth/v1/oauth/callback'

export function ProvidersPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Login social"
        description="Deixe seus usuários entrarem com Google ou GitHub, usando os OAuth apps da sua conta."
      />
      <SettingsSection
        title="URL de callback"
        description="Cadastre este endereço como URL de redirecionamento no OAuth app do Google e do GitHub."
      >
        <SecretReveal label="Callback URL" value={`${API_BASE_URL}${CALLBACK_PATH}`} />
      </SettingsSection>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <ProviderForm projectId={projectId} provider="google" />
        <ProviderForm projectId={projectId} provider="github" />
      </div>
    </div>
  )
}
