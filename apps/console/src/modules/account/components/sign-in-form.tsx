import type { SignInResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSignInMutation } from '@/modules/account/queries/use-sign-in-mutation'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

type SignInFormProps = {
  onResult: (result: SignInResult) => void
  onForgotPassword: () => void
}

export function SignInForm({ onResult, onForgotPassword }: SignInFormProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useSignInMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    signIn.mutate({ email, password }, { onSuccess: onResult })
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
      <div className="grid gap-2">
        <FormField
          label="Senha"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button
          type="button"
          variant="link"
          className="h-auto justify-self-end p-0 text-base"
          onClick={onForgotPassword}
        >
          Esqueci minha senha
        </Button>
      </div>
      <ErrorAlert error={signIn.error} />
      <Button type="submit" size="lg" disabled={signIn.isPending} aria-busy={signIn.isPending}>
        Entrar
      </Button>
    </form>
  )
}
