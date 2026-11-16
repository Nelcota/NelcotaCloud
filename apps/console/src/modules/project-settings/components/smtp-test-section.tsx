import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSmtpTestMutation } from '@/modules/project-settings/queries/use-smtp-test'
import { useSession } from '@/shared/auth/use-session'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

/**
 * Proves the project's own SMTP server delivers, before users depend on it. Offered only
 * while a custom server is configured: the API refuses tests through the platform's server.
 */
export function SmtpTestSection({ projectId }: { projectId: string }): JSX.Element {
  const session = useSession()
  const [recipient, setRecipient] = useState(session?.user.email ?? '')
  const test = useSmtpTestMutation(projectId)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    test.mutate(recipient)
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Testar o envio"
        description="Envia um email pelo seu servidor e espera ele aceitar. Se algo estiver errado, o erro aparece aqui."
        footer={
          <>
            <SavedNote isSaved={test.isSuccess} message="Seu servidor aceitou o email" />
            <Button
              type="submit"
              variant="outline"
              disabled={test.isPending}
              aria-busy={test.isPending}
            >
              Enviar email de teste
            </Button>
          </>
        }
      >
        <FormField
          label="Enviar para"
          type="email"
          required
          autoComplete="email"
          value={recipient}
          onChange={(event) => setRecipient(event.target.value)}
        />
        <ErrorAlert error={test.error} />
      </SettingsSection>
    </form>
  )
}
