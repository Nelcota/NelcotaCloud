import type { SignInResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { useSignInMutation } from '@/modules/account/queries/use-sign-in-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import { TextField } from '@/shared/ui/text-field'

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
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="username"
        spellCheck={false}
        autoFocus
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <TextField
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={onForgotPassword}
          >
            Esqueci minha senha
          </Button>
        </div>
      </div>
      <ErrorAlert error={signIn.error} />
      <PendingButton type="submit" size="lg" className="w-full" isPending={signIn.isPending}>
        Entrar
      </PendingButton>
    </form>
  )
}
