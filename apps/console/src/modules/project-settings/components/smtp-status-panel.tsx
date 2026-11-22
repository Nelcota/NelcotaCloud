import type { JSX } from 'react'

import { SmtpFacts } from '@/modules/project-settings/components/smtp-facts'
import type { components } from '@/shared/api/api-schema'
import { SettingsSection } from '@/shared/ui/settings-section'

/** The project's own server, as read-only facts. */
export function SmtpStatusPanel({
  view,
}: {
  view: components['schemas']['SmtpSettingsView']
}): JSX.Element {
  return (
    <SettingsSection title="Seu servidor" description="A senha fica cifrada e não aparece aqui.">
      <SmtpFacts view={view} />
    </SettingsSection>
  )
}
