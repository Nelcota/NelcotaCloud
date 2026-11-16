import { useMutation } from '@tanstack/react-query'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  configureProvider,
  type OAuthProviderName,
} from '@/modules/project-settings/api/configure-provider'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

const PROVIDER_NAMES: Record<OAuthProviderName, string> = { google: 'Google', github: 'GitHub' }

type ProviderFormProps = {
  projectId: string
  provider: OAuthProviderName
}

/** The client secret is write-only: it is encrypted on save and never shown again. */
export function ProviderForm({ projectId, provider }: ProviderFormProps): JSX.Element {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const providerName = PROVIDER_NAMES[provider]
  const save = useMutation({
    mutationFn: () =>
      configureProvider(projectId, provider, { client_id: clientId, client_secret: clientSecret }),
    onSuccess: () => setClientSecret(''),
  })

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={submit} className="h-full">
      <SettingsSection
        title={providerName}
        description={`Use o OAuth app do seu próprio ${providerName}. Salvar de novo substitui o atual.`}
        footer={
          <>
            <SavedNote isSaved={save.isSuccess} message="Configurado" />
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              Salvar {providerName}
            </Button>
          </>
        }
      >
        <FormField
          label="Client ID"
          required
          autoComplete="off"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        />
        <FormField
          label="Client secret"
          type="password"
          autoComplete="off"
          required
          value={clientSecret}
          onChange={(event) => setClientSecret(event.target.value)}
        />
        <ErrorAlert error={save.error} />
      </SettingsSection>
    </form>
  )
}
