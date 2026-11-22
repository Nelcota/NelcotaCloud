import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useRecoverPasswordMutation } from '@/modules/account/queries/use-recover-password-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { TextField } from '@/shared/ui/text-field'

/** Asks for a reset link; the answer is the same whether or not the email has an account. */
export function RecoverPasswordForm({ onSent }: { onSent: () => void }): JSX.Element {
  const [email, setEmail] = useState('')
  const recover = useRecoverPasswordMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    recover.mutate(email, { onSuccess: onSent })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <ErrorAlert error={recover.error} />
      <PendingButton
        type="submit"
        size="lg"
        className="w-full"
        isPending={recover.isPending}
        disabled={email.trim() === ''}
      >
        Enviar link de redefinição
      </PendingButton>
    </form>
  )
}
