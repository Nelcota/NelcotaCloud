import { useId, type JSX } from 'react'

import { FormError } from '@/modules/project-settings/components/form-error'
import { SaveFooter } from '@/modules/project-settings/components/save-footer'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { rowDescriptionId } from '@/modules/project-settings/components/row-description-id'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { SiteUrlInput } from '@/modules/project-settings/components/site-url-input'
import { useSettingsDraft } from '@/modules/project-settings/components/use-settings-draft'
import type { components } from '@/shared/api/api-schema'
import { withoutHttps } from '@/shared/lib/web-address'
import { Input } from '@/shared/ui/primitives/input'

type GeneralSettingsFormProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

/** The project's name and the site its emails and social logins return to. */
export function GeneralSettingsForm({
  projectId,
  settings,
}: GeneralSettingsFormProps): JSX.Element {
  const nameId = useId()
  const siteId = useId()
  const { draft, setDraft, hasChanges, update, submit } = useSettingsDraft(projectId, settings)

  return (
    <SettingsGroup
      title="Projeto"
      description="O nome entra nos emails que os usuários recebem."
      onSubmit={submit}
      footer={
        <SaveFooter
          isSaved={update.isSuccess}
          isPending={update.isPending}
          hasChanges={hasChanges}
        />
      }
    >
      <SettingsRow title="Nome do projeto" controlId={nameId} isWide>
        <Input
          id={nameId}
          required
          autoComplete="off"
          aria-describedby={rowDescriptionId(nameId)}
          value={draft.name ?? settings.name}
          onChange={(event) => {
            const name = event.target.value
            setDraft((current) => ({ ...current, name }))
          }}
        />
      </SettingsRow>
      <SettingsRow
        title="Site do app"
        description="Emails e login social voltam para cá."
        controlId={siteId}
        isWide
      >
        <SiteUrlInput
          id={siteId}
          describedBy={rowDescriptionId(siteId)}
          value={draft.site_url ?? withoutHttps(settings.site_url)}
          onChange={(site_url) => setDraft((current) => ({ ...current, site_url }))}
        />
      </SettingsRow>
      <FormError error={update.error} />
    </SettingsGroup>
  )
}
