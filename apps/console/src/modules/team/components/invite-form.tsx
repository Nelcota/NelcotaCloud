import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useInviteMemberMutation } from '@/modules/team/queries/use-team'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'

/** Owners invite people by email; they join as members once they accept in the console. */
export function InviteForm({ projectId }: { projectId: string }): JSX.Element {
  const [email, setEmail] = useState('')
  const invitation = useInviteMemberMutation(projectId)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    invitation.mutate(email, { onSuccess: () => setEmail('') })
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Convidar pessoas"
        description="Quem for convidado recebe um email e entra como membro ao aceitar no console, com o mesmo email. Membros gerenciam o projeto, mas não podem excluí-lo nem convidar outras pessoas."
        footer={
          <>
            <SavedNote isSaved={invitation.isSuccess} message={sentMessage(invitation.data)} />
            <Button type="submit" disabled={invitation.isPending} aria-busy={invitation.isPending}>
              Enviar convite
            </Button>
          </>
        }
      >
        <FormField
          label="Email"
          type="email"
          required
          autoComplete="off"
          placeholder="pessoa@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <ErrorAlert error={invitation.error} />
      </SettingsSection>
    </form>
  )
}

function sentMessage(invitation: { email: string } | undefined): string {
  if (invitation === undefined) {
    return ''
  }

  return `Convite enviado para ${invitation.email}`
}
