import type { SignUpResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSignUpMutation } from '@/modules/account/queries/use-sign-up-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

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
      <FormField
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint="Pelo menos 8 caracteres."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={signUp.error} />
      <Button type="submit" size="lg" disabled={signUp.isPending} aria-busy={signUp.isPending}>
        Criar conta
      </Button>
    </form>
  )
}
