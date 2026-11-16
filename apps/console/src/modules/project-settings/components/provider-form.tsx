import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { useConfigureProviderMutation } from '@/modules/project-settings/queries/use-oauth-providers'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type ProviderFormProps = {
  projectId: string
  provider: OAuthProviderName
  onDone: () => void
}

/** The client secret is write-only: it is encrypted on save and never shown again. */
export function ProviderForm({ projectId, provider, onDone }: ProviderFormProps): JSX.Element {
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const save = useConfigureProviderMutation({ projectId, provider })

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate({ client_id: clientId, client_secret: clientSecret }, { onSuccess: onDone })
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border p-4">
      <FormField
        label="Client ID"
        required
        autoComplete="off"
        autoFocus
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
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
          Salvar e ativar
        </Button>
      </div>
    </form>
  )
}
