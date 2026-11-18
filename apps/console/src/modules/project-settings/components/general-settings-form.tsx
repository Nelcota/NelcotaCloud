import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useUpdateSettingsMutation } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { withHttps, withoutHttps } from '@/shared/lib/web-address'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'
import { SwitchField } from '@/shared/ui/switch-field'
import { UrlField } from '@/shared/ui/url-field'

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
  const [siteUrl, setSiteUrl] = useState(withoutHttps(settings.site_url))
  const [requiresVerification, setRequiresVerification] = useState(
    settings.require_email_verification,
  )

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    update.mutate({
      name,
      site_url: withHttps(siteUrl),
      require_email_verification: requiresVerification,
    })
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Geral"
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
        <UrlField
          label="Site do app"
          required
          placeholder="app.exemplo.com"
          hint="Os links dos emails abrem aqui, e o login social volta para cá."
          value={siteUrl}
          onChange={setSiteUrl}
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
