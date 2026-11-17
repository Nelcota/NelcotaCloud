import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useRecoverPasswordMutation } from '@/modules/account/queries/use-recover-password-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

/** Asks for a reset link; the answer is the same whether or not the email has an account. */
export function RecoverPasswordForm({ onSent }: { onSent: () => void }): JSX.Element {
  const [email, setEmail] = useState('')
  const recover = useRecoverPasswordMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    recover.mutate(email, { onSuccess: onSent })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <ErrorAlert error={recover.error} />
      <Button type="submit" size="lg" disabled={recover.isPending} aria-busy={recover.isPending}>
        Enviar link de redefinição
      </Button>
    </form>
  )
}
