import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSmtpTestMutation } from '@/modules/project-settings/queries/use-smtp-test'
import { useSession } from '@/shared/auth/use-session'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'
import { TextField } from '@/shared/ui/text-field'

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
    <SettingsSection
      title="Testar o envio"
      description="Um email de teste pelo seu servidor confirma a entrega."
      onSubmit={submit}
      footer={
        <>
          <SavedNote isSaved={test.isSuccess} message="Seu servidor aceitou o email" />
          <PendingButton type="submit" variant="outline" size="sm" isPending={test.isPending}>
            Enviar email de teste
          </PendingButton>
        </>
      }
    >
      <TextField
        label="Enviar para"
        type="email"
        required
        autoComplete="email"
        value={recipient}
        onChange={(event) => setTypedRecipient(event.target.value)}
      />
      <ErrorAlert error={test.error} />
    </SettingsSection>
  )
}
