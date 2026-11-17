import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { CurrentSmtp } from '@/modules/project-settings/components/current-smtp'
import { SmtpTestSection } from '@/modules/project-settings/components/smtp-test-section'
import {
  useResetSmtpMutation,
  useSaveSmtpMutation,
  useSmtpQuery,
} from '@/modules/project-settings/queries/use-project-settings'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { LoadError } from '@/shared/ui/load-error'
import { FormField } from '@/shared/ui/form-field'
import { PageHeader } from '@/shared/ui/page-header'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

export function EmailPage(): JSX.Element {
  const projectId = useProjectId()
  const smtp = useSmtpQuery(projectId)
  const save = useSaveSmtpMutation(projectId)
  const reset = useResetSmtpMutation(projectId)
  const [smtpUrl, setSmtpUrl] = useState('')
  const [emailFrom, setEmailFrom] = useState('')

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate({ smtp_url: smtpUrl, email_from: emailFrom }, { onSuccess: () => setSmtpUrl('') })
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <PageHeader
        title="Email"
        description="Confirmação de email, redefinição de senha e magic link saem por aqui."
      />
      <LoadError error={smtp.error} onRetry={() => smtp.refetch()} />
      <ErrorAlert error={reset.error} />
      <SettingsSection title="Servidor atual">
        <CurrentSmtp
          view={smtp.data}
          isResetting={reset.isPending}
          onReset={() => reset.mutate()}
        />
      </SettingsSection>
      <SmtpTest projectId={projectId} isCustom={smtp.data?.is_custom === true} />
      <form onSubmit={submit}>
        <SettingsSection
          title="Usar seu servidor SMTP"
          description="Os emails saem com o seu domínio. Salvar de novo substitui o servidor atual."
          footer={
            <>
              <SavedNote isSaved={save.isSuccess} message="Servidor salvo" />
              <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
                Salvar servidor
              </Button>
            </>
          }
        >
          <FormField
            label="SMTP URL"
            autoComplete="off"
            spellCheck={false}
            required
            placeholder="smtps://usuario:senha@smtp.exemplo.com:465"
            hint="Use TLS: smtps:// na porta 465 ou smtp:// com ?tls=required. Host público; usuário e senha ficam cifrados e não aparecem de novo."
            value={smtpUrl}
            onChange={(event) => setSmtpUrl(event.target.value)}
          />
          <FormField
            label="Remetente"
            required
            placeholder="Acme <no-reply@acme.com>"
            value={emailFrom}
            onChange={(event) => setEmailFrom(event.target.value)}
          />
          <ErrorAlert error={save.error} />
        </SettingsSection>
      </form>
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
