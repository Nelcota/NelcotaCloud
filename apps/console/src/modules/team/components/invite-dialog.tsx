import UserPlus from '~icons/solar/user-plus-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { InviteIllustration } from '@/modules/team/components/team-illustrations'
import { useInviteMemberMutation } from '@/modules/team/queries/use-team'
import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { FormField } from '@/shared/ui/form-field'

/** Enough to catch a typo before sending; the API checks the address for real. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type InviteDialogProps = {
  projectId: string
  /** Called with the invited email once the invitation is sent. */
  onInvited: (email: string) => void
}

/**
 * One field, so one step: the email, with what the person will be able to do said under it.
 * They join as a member when they accept.
 */
export function InviteDialog({ projectId, onInvited }: InviteDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const invitation = useInviteMemberMutation(projectId)

  function open(): void {
    setEmail('')
    invitation.reset()
    setIsOpen(true)
  }

  async function invite(): Promise<void> {
    const sent = await invitation.mutateAsync(email.trim())
    onInvited(sent.email)
  }

  return (
    <>
      <Button onClick={open}>
        <UserPlus />
        Convidar pessoa
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Convidar pessoa"
        description="Ela entra como membro: gerencia o projeto inteiro, inclusive as secret keys, mas não convida nem remove pessoas."
        confirmLabel="Enviar convite"
        illustration={<InviteIllustration />}
        canConfirm={EMAIL_SHAPE.test(email.trim())}
        onConfirm={invite}
      >
        <FormField
          label="Email da pessoa"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="pessoa@empresa.com"
          hint="Ela aceita no console com este email; se não tiver conta, cria uma."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </ConfirmDialog>
    </>
  )
}
