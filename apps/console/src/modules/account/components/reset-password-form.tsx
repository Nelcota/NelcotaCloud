import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { PASSWORD_FIELD_ICON } from '@/modules/account/model/field-icons'
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from '@/modules/account/model/password-rule'
import { useResetPasswordMutation } from '@/modules/account/queries/use-reset-password-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PasswordField } from '@/shared/ui/password-field'

type ResetPasswordFormProps = {
  token: string
  onDone: () => void
}

/** The page's only task, opened from an email, so its field takes focus on any device. */
export function ResetPasswordForm({ token, onDone }: ResetPasswordFormProps): JSX.Element {
  const [password, setPassword] = useState('')
  const reset = useResetPasswordMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    reset.mutate({ token, password }, { onSuccess: onDone })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <PasswordField
        label="Nova senha"
        icon={PASSWORD_FIELD_ICON}
        autoComplete="new-password"
        autoFocus
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={PASSWORD_HINT}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={reset.error} />
      <Button type="submit" size="lg" disabled={reset.isPending} aria-busy={reset.isPending}>
        Salvar nova senha
      </Button>
    </form>
  )
}
