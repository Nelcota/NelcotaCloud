import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  useResetSmtpMutation,
  useSaveSmtpMutation,
  useSmtpQuery,
} from '@/modules/project-settings/queries/use-project-settings'
import { useProjectId } from '@/shared/routing/use-project-id'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

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
    <Card>
      <CardHeader>
        <CardTitle>Envio de emails</CardTitle>
        <CardDescription>
          Confirmação, redefinição de senha e magic link saem pelo SMTP da plataforma, ou pelo seu
          servidor SMTP com o seu remetente.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <CurrentSmtp
          view={smtp.data}
          isResetting={reset.isPending}
          onReset={() => reset.mutate()}
        />
        <form className="grid gap-4" onSubmit={submit}>
          <FormField
            label="SMTP URL"
            type="password"
            autoComplete="off"
            required
            placeholder="smtps://usuario:senha@smtp.exemplo.com:465"
            hint="Host público e porta 25, 465, 587 ou 2525. As credenciais ficam cifradas e não voltam a aparecer."
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
          <ErrorAlert error={save.error ?? reset.error ?? smtp.error} />
          <div>
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              Usar meu SMTP
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

type CurrentSmtpProps = {
  view: { is_custom: boolean; smtp_host?: string | null; email_from?: string | null } | undefined
  isResetting: boolean
  onReset: () => void
}

function CurrentSmtp({ view, isResetting, onReset }: CurrentSmtpProps): JSX.Element | null {
  if (view === undefined) {
    return null
  }

  if (view.is_custom === false) {
    return <p className="text-sm">Usando o SMTP da plataforma.</p>
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
      <span>
        Usando <strong>{view.smtp_host}</strong> como <strong>{view.email_from}</strong>
      </span>
      <Button variant="outline" size="sm" disabled={isResetting} onClick={onReset}>
        Voltar ao SMTP da plataforma
      </Button>
    </div>
  )
}
