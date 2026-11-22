import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useResetPasswordMutation } from '@/modules/account/queries/use-reset-password-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { TextField } from '@/shared/ui/text-field'

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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
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
      <PendingButton
        type="submit"
        size="lg"
        className="w-full"
        isPending={reset.isPending}
        disabled={password.length < MIN_PASSWORD_LENGTH}
      >
        Salvar senha
      </PendingButton>
    </form>
  )
}
