import type { SignUpResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSignUpMutation } from '@/modules/account/queries/use-sign-up-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { TextField } from '@/shared/ui/text-field'

const MIN_PASSWORD_LENGTH = 8

export function SignUpForm({
  onResult,
}: {
  onResult: (result: SignUpResult) => void
}): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signUp = useSignUpMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    signUp.mutate({ email, password }, { onSuccess: onResult })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        spellCheck={false}
        autoFocus
        required
        className="[&_input]:h-10"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint="Pelo menos 8 caracteres."
        className="[&_input]:h-10"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={signUp.error} />
      <PendingButton
        type="submit"
        size="lg"
        className="h-10 w-full"
        isPending={signUp.isPending}
        disabled={email.trim() === '' || password.length < MIN_PASSWORD_LENGTH}
      >
        Criar conta
      </PendingButton>
    </form>
  )
}
