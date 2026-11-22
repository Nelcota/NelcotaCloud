import { useId, type JSX } from 'react'

import { FormError } from '@/modules/project-settings/components/form-error'
import { SaveFooter } from '@/modules/project-settings/components/save-footer'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { rowDescriptionId } from '@/modules/project-settings/components/row-description-id'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { useSettingsDraft } from '@/modules/project-settings/components/use-settings-draft'
import type { components } from '@/shared/api/api-schema'
import { Switch } from '@/shared/ui/primitives/switch'

type EmailVerificationFormProps = {
  projectId: string
  settings: components['schemas']['TenantSettings']
}

/** Whether password logins wait for the inbox to be confirmed. */
export function EmailVerificationForm({
  projectId,
  settings,
}: EmailVerificationFormProps): JSX.Element {
  const switchId = useId()
  const { draft, setDraft, hasChanges, update, submit } = useSettingsDraft(projectId, settings)

  return (
    <SettingsGroup
      title="Acesso"
      onSubmit={submit}
      footer={
        <SaveFooter
          isSaved={update.isSuccess}
          isPending={update.isPending}
          hasChanges={hasChanges}
        />
      }
    >
      <SettingsRow
        title="Exigir email confirmado"
        description="Login com senha só depois de confirmar o email."
        controlId={switchId}
      >
        <Switch
          id={switchId}
          aria-describedby={rowDescriptionId(switchId)}
          checked={draft.require_email_verification ?? settings.require_email_verification}
          onCheckedChange={(require_email_verification) =>
            setDraft((current) => ({ ...current, require_email_verification }))
          }
        />
      </SettingsRow>
      <FormError error={update.error} />
    </SettingsGroup>
  )
}
