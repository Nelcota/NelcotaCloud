import type { SignInResult } from '@nelcota/sdk'
import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { EMAIL_FIELD_ICON, PASSWORD_FIELD_ICON } from '@/modules/account/model/field-icons'
import { useSignInMutation } from '@/modules/account/queries/use-sign-in-mutation'
import { prefersAutoFocus } from '@/shared/lib/prefers-auto-focus'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { PasswordField } from '@/shared/ui/password-field'

type SignInFormProps = {
  /** Owned by the login page, so a reset link can be asked for without typing it again. */
  email: string
  onEmailChange: (email: string) => void
  onResult: (result: SignInResult) => void
  onForgotPassword: () => void
}

export function SignInForm(props: SignInFormProps): JSX.Element {
  const { email, onEmailChange, onResult, onForgotPassword } = props
  const [password, setPassword] = useState('')
  const signIn = useSignInMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    signIn.mutate({ email, password }, { onSuccess: onResult })
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Email"
        icon={EMAIL_FIELD_ICON}
        type="email"
        autoComplete="email"
        autoFocus={prefersAutoFocus()}
        required
        value={email}
        onChange={(event) => onEmailChange(event.target.value)}
      />
      <PasswordField
        label="Senha"
        icon={PASSWORD_FIELD_ICON}
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        labelAction={
          <Button
            type="button"
            variant="link"
            className="text-muted-foreground hover:text-foreground -my-2 h-auto px-0 py-2"
            onClick={onForgotPassword}
          >
            Esqueceu a senha?
          </Button>
        }
      />
      <ErrorAlert error={signIn.error} />
      <Button type="submit" size="lg" disabled={signIn.isPending} aria-busy={signIn.isPending}>
        Entrar
      </Button>
    </form>
  )
}
