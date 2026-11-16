import type { JSX } from 'react'

import { SecretReveal } from '@/modules/api-keys/components/secret-reveal'
import { ProviderForm } from '@/modules/project-settings/components/provider-form'
import { API_BASE_URL } from '@/shared/api/api-base-url'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Alert, AlertDescription } from '@/shared/ui/alert'

const CALLBACK_PATH = '/auth/v1/oauth/callback'

export function ProvidersPage(): JSX.Element {
  const projectId = useProjectId()

  return (
    <div className="grid gap-6">
      <Alert>
        <AlertDescription className="grid gap-3">
          <span>No Google e no GitHub, cadastre esta URL de callback no seu OAuth app:</span>
          <SecretReveal label="Callback URL" value={`${API_BASE_URL}${CALLBACK_PATH}`} />
        </AlertDescription>
      </Alert>
      <ProviderForm projectId={projectId} provider="google" />
      <ProviderForm projectId={projectId} provider="github" />
    </div>
  )
}
