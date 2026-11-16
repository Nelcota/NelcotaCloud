import { useMutation } from '@tanstack/react-query'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  configureProvider,
  type OAuthProviderName,
} from '@/modules/project-settings/api/configure-provider'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

const PROVIDER_NAMES: Record<OAuthProviderName, string> = { google: 'Google', github: 'GitHub' }

type ProviderFormProps = {
  projectId: string
  provider: OAuthProviderName
}

/** The client secret is write-only: it is encrypted on save and never shown again. */
export function ProviderForm({ projectId, provider }: ProviderFormProps): JSX.Element {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
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
    <Card>
      <CardHeader>
        <CardTitle>{PROVIDER_NAMES[provider]}</CardTitle>
        <CardDescription>
          Use o OAuth app do seu próprio {PROVIDER_NAMES[provider]}; salvar de novo substitui o
          atual.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <FormField
            label="Client ID"
            required
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
          <SavedNote isSaved={save.isSuccess} />
          <div>
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              Salvar {PROVIDER_NAMES[provider]}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function SavedNote({ isSaved }: { isSaved: boolean }): JSX.Element | null {
  if (isSaved === false) {
    return null
  }

  return (
    <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
      Provedor configurado.
    </p>
  )
}
