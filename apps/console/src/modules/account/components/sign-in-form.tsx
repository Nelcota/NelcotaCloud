import type { SignInResult } from '@nelcota/sdk'
import { ArrowRight } from 'lucide-react'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { PasswordField } from '@/modules/account/components/password-field'
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
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextField
        label="Email"
        type="email"
        name="email"
        autoComplete="username"
        spellCheck={false}
        autoFocus
        required
        className="[&_input]:h-10"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <PasswordField
        label="Senha"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
        labelAction={
          <Button
            type="button"
            variant="link"
            size="sm"
            className="text-xs font-normal text-muted-foreground hover:text-foreground"
            onClick={onForgotPassword}
          >
            Esqueci minha senha
          </Button>
        }
      />
      <ErrorAlert error={signIn.error} />
      <PendingButton type="submit" size="lg" className="w-full" isPending={signIn.isPending}>
        Entrar
        <ArrowRight aria-hidden data-icon="inline-end" />
      </PendingButton>
    </form>
  )
}
