import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useUpdateSettingsMutation } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'
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
    <form onSubmit={submit}>
      <SettingsSection
        title="Geral"
        description="Como o projeto se chama e para onde os links de email e o OAuth levam."
        footer={
          <>
            <SavedNote isSaved={update.isSuccess} message="Configurações salvas" />
            <Button type="submit" disabled={update.isPending} aria-busy={update.isPending}>
              Salvar alterações
            </Button>
          </>
        }
      >
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
          label="Exigir email confirmado"
          description="Login com senha e renovação de sessão só para quem confirmou o email."
          checked={requiresVerification}
          onCheckedChange={setRequiresVerification}
        />
        <ErrorAlert error={update.error} />
      </SettingsSection>
    </form>
  )
}
