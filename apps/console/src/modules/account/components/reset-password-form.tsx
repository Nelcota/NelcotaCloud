import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useResetPasswordMutation } from '@/modules/account/queries/use-reset-password-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

const MIN_PASSWORD_LENGTH = 8

type ResetPasswordFormProps = {
  token: string
  onDone: () => void
}

export function ResetPasswordForm({ token, onDone }: ResetPasswordFormProps): JSX.Element {
  const [password, setPassword] = useState('')
  const reset = useResetPasswordMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    reset.mutate({ token, password }, { onSuccess: onDone })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        autoFocus
        required
        minLength={MIN_PASSWORD_LENGTH}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={reset.error} />
      <Button type="submit" size="lg" disabled={reset.isPending} aria-busy={reset.isPending}>
        Salvar senha
      </Button>
    </form>
  )
}
