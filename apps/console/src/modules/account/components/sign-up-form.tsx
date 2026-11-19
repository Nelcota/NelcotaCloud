import type { SignUpResult } from '@nelcota/sdk'
import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import { EMAIL_FIELD_ICON, PASSWORD_FIELD_ICON } from '@/modules/account/model/field-icons'
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from '@/modules/account/model/password-rule'
import { useSignUpMutation } from '@/modules/account/queries/use-sign-up-mutation'
import { errorCodeOf } from '@/shared/api/error-code'
import { prefersAutoFocus } from '@/shared/lib/prefers-auto-focus'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { PasswordField } from '@/shared/ui/password-field'

const EMAIL_TAKEN = 'email_taken'

type SignUpFormProps = {
  /** Owned by the login page, so switching to sign-in keeps it typed. */
  email: string
  onEmailChange: (email: string) => void
  /** Gets the address too, so a "check your email" notice can say where the link went. */
  onResult: (result: SignUpResult, email: string) => void
  onSignInInstead: () => void
}

export function SignUpForm(props: SignUpFormProps): JSX.Element {
  const { email, onEmailChange, onResult, onSignInInstead } = props
  const [password, setPassword] = useState('')
  const signUp = useSignUpMutation()

  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()
    signUp.mutate(
      { email, password },
      { onSuccess: (result, credentials) => onResult(result, credentials.email) },
    )
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
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint={PASSWORD_HINT}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={signUp.error} />
      <SignInInstead error={signUp.error} onSignInInstead={onSignInInstead} />
      <Button type="submit" size="lg" disabled={signUp.isPending} aria-busy={signUp.isPending}>
        Criar minha conta
      </Button>
    </form>
  )
}

/** When the address already has an account, the next step is signing in with it. */
function SignInInstead(props: { error: unknown; onSignInInstead: () => void }): JSX.Element | null {
  if (errorCodeOf(props.error) !== EMAIL_TAKEN) {
    return null
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="w-full"
      onClick={props.onSignInInstead}
    >
      Entrar com este email
    </Button>
  )
}
