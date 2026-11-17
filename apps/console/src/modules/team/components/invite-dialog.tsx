import UserPlus from '~icons/solar/user-plus-linear'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useInviteMemberMutation } from '@/modules/team/queries/use-team'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type InviteDialogProps = {
  projectId: string
  /** Called with the invited email once the invitation is sent. */
  onInvited: (email: string) => void
}

/** Owners invite by email; the person joins as a member when they accept in the console. */
export function InviteDialog({ projectId, onInvited }: InviteDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const invitation = useInviteMemberMutation(projectId)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    invitation.mutate(email.trim(), {
      onSuccess: (sent) => {
        setIsOpen(false)
        onInvited(sent.email)
      },
    })
  }

  function resetWhenClosed(open: boolean): void {
    if (open) {
      return
    }

    setEmail('')
    invitation.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} onOpenChangeComplete={resetWhenClosed}>
      <DialogTrigger render={<Button />}>
        <UserPlus />
        Convidar pessoa
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>Convidar pessoa</DialogTitle>
            <DialogDescription>
              A pessoa recebe um email e entra como membro ao aceitar no console com esse mesmo
              email; quem ainda não tem conta cria uma com ele. Membros gerenciam o projeto inteiro,
              inclusive as secret keys.
            </DialogDescription>
          </DialogHeader>
          <FormField
            label="Email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="pessoa@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <ErrorAlert error={invitation.error} />
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={invitation.isPending} aria-busy={invitation.isPending}>
              <SendLabel isSending={invitation.isPending} />
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SendLabel({ isSending }: { isSending: boolean }): JSX.Element {
  if (isSending) {
    return <>Enviando…</>
  }

  return <>Enviar convite</>
}
