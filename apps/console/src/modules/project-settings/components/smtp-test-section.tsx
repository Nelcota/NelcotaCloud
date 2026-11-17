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
 * It goes to the account's own inbox unless another address is typed: one click to test.
 */
export function SmtpTestSection({ projectId }: { projectId: string }): JSX.Element {
  const session = useSession()
  const [typedRecipient, setTypedRecipient] = useState<string | null>(null)
  const test = useSmtpTestMutation(projectId)
  const recipient = typedRecipient ?? session?.user.email ?? ''

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    test.mutate(recipient.trim())
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Testar o envio"
        description="Envia um email pelo seu servidor e espera ele aceitar."
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
          onChange={(event) => setTypedRecipient(event.target.value)}
        />
        <ErrorAlert error={test.error} />
      </SettingsSection>
    </form>
  )
}
