import type { JSX } from 'react'

import { emailApiSnippets } from '@/modules/project-settings/components/email-api-snippets'
import { EmailTemplatesSection } from '@/modules/project-settings/components/email-templates-section'
import { SmtpHeaderActions } from '@/modules/project-settings/components/smtp-header-actions'
import { SmtpOverview } from '@/modules/project-settings/components/smtp-overview'
import { useSmtpQuery } from '@/modules/project-settings/queries/use-project-settings'
import { usePublishableKey } from '@/modules/project-settings/queries/use-publishable-key'
import { useProjectId } from '@/shared/routing/use-project-id'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { LoadError } from '@/shared/ui/load-error'
import { PageHeader } from '@/shared/ui/page-header'

export function EmailPage(): JSX.Element {
  const projectId = useProjectId()
  const smtp = useSmtpQuery(projectId)
  const publishableKey = usePublishableKey(projectId)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Email"
        description="Verificação, redefinição de senha e link mágico."
        actions={
          <>
            <ApiSheet
              title="Emails pela API"
              description="Cada chamada abaixo dispara um destes emails."
              snippets={emailApiSnippets(publishableKey)}
            />
            <SmtpHeaderActions projectId={projectId} view={smtp.data} />
          </>
        }
      />
      <LoadError error={smtp.error} onRetry={() => smtp.refetch()} />
      <SmtpOverview projectId={projectId} view={smtp.data} hasFailed={smtp.isError} />
      <EmailTemplatesSection projectId={projectId} />
    </div>
  )
}
