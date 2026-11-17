import type { JSX } from 'react'

import { CurrentSmtp } from '@/modules/project-settings/components/current-smtp'
import { EmailTemplatesSection } from '@/modules/project-settings/components/email-templates-section'
import { SmtpTestSection } from '@/modules/project-settings/components/smtp-test-section'
import { useSmtpQuery } from '@/modules/project-settings/queries/use-project-settings'
import { useProjectId } from '@/shared/routing/use-project-id'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'
import { SettingsSection } from '@/shared/ui/settings-section'

export function EmailPage(): JSX.Element {
  const projectId = useProjectId()
  const smtp = useSmtpQuery(projectId)

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Email"
        description="Confirmação de email, redefinição de senha e magic link saem por aqui."
      />
      <LoadError error={smtp.error} onRetry={() => smtp.refetch()} />
      <SettingsSection title="Servidor atual">
        <CurrentSmtp projectId={projectId} view={smtp.data} hasFailed={smtp.isError} />
      </SettingsSection>
      <SmtpTest projectId={projectId} isCustom={smtp.data?.is_custom === true} />
      <EmailTemplatesSection projectId={projectId} />
    </div>
  )
}

/** Testing only makes sense, and is only allowed, for the project's own server. */
function SmtpTest({
  projectId,
  isCustom,
}: {
  projectId: string
  isCustom: boolean
}): JSX.Element | null {
  if (isCustom === false) {
    return null
  }

  return <SmtpTestSection projectId={projectId} />
}
