import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useUpdateSettingsMutation } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SwitchField } from '@/shared/ui/switch-field'

type TenantSettings = components['schemas']['TenantSettings']

type GeneralSettingsFormProps = {
  projectId: string
  settings: TenantSettings
}

/** Mounted with the loaded settings, so its fields start from the saved values. */
export function GeneralSettingsForm({
  projectId,
  settings,
}: GeneralSettingsFormProps): JSX.Element {
  const update = useUpdateSettingsMutation(projectId)
  const [name, setName] = useState(settings.name)
  const [siteUrl, setSiteUrl] = useState(settings.site_url)
  const [requiresVerification, setRequiresVerification] = useState(
    settings.require_email_verification,
  )

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    update.mutate({ name, site_url: siteUrl, require_email_verification: requiresVerification })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Nome"
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <FormField
        label="URL do seu app"
        type="url"
        required
        hint="Links de email abrem aqui; o OAuth só redireciona para endereços abaixo dela."
        value={siteUrl}
        onChange={(event) => setSiteUrl(event.target.value)}
      />
      <SwitchField
        label="Exigir confirmação de email para login com senha"
        checked={requiresVerification}
        onCheckedChange={setRequiresVerification}
      />
      <ErrorAlert error={update.error} />
      <SavedNote isSaved={update.isSuccess} />
      <div>
        <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  )
}

function SavedNote({ isSaved }: { isSaved: boolean }): JSX.Element | null {
  if (isSaved === false) {
    return null
  }

  return (
    <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
      Configurações salvas.
    </p>
  )
}
