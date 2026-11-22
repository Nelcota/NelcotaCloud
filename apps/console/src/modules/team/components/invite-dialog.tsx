import { UserPlus } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { useInviteMemberMutation } from '@/modules/team/queries/use-team'
import type { components } from '@/shared/api/api-schema'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import { TextField } from '@/shared/ui/text-field'

/** Enough to catch a typo before sending; the API checks the address for real. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type InviteDialogProps = {
  projectId: string
  onInvited: (invitation: components['schemas']['PendingInvitation']) => void
}

/**
 * One field, so one step: the email, with what the person will be able to do said above it.
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
    onInvited(sent)
  }

  return (
    <>
      <Button type="button" onClick={open}>
        <UserPlus aria-hidden data-icon="inline-start" />
        Convidar
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title="Convidar pessoa"
        description="Ela entra como membro: gerencia o projeto, mas não convida nem remove pessoas."
        confirmLabel="Enviar convite"
        canConfirm={EMAIL_SHAPE.test(email.trim())}
        onConfirm={invite}
      >
        <TextField
          label="Email da pessoa"
          type="email"
          required
          autoFocus
          autoComplete="email"
          placeholder="pessoa@empresa.com"
          hint="Ela aceita no console com este email, criando uma conta se preciso."
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </ConfirmDialog>
    </>
  )
}
