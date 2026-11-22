import type { SignUpResult } from '@nelcota/sdk'
import { ArrowRight } from 'lucide-react'
import type { FormEvent, JSX } from 'react'
import { useId, useState } from 'react'

import { PasswordField } from '@/modules/account/components/password-field'
import { MIN_PASSWORD_LENGTH } from '@/modules/account/components/password-policy'
import { PasswordRules } from '@/modules/account/components/password-rules'
import { useSignUpMutation } from '@/modules/account/queries/use-sign-up-mutation'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { TextField } from '@/shared/ui/text-field'

export function SignUpForm({
  onResult,
}: {
  onResult: (result: SignUpResult) => void
}): JSX.Element {
  const rulesId = useId()
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
        name="email"
        autoComplete="email"
        spellCheck={false}
        autoFocus
        required
        className="[&_input]:h-10"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <div className="grid gap-2">
        <PasswordField
          label="Senha"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          describedById={rulesId}
        />
        <PasswordRules id={rulesId} password={password} />
      </div>
      <ErrorAlert error={signUp.error} />
      <PendingButton
        type="submit"
        size="lg"
        className="w-full"
        isPending={signUp.isPending}
        disabled={email.trim() === '' || password.length < MIN_PASSWORD_LENGTH}
      >
        Criar conta
        <ArrowRight aria-hidden data-icon="inline-end" />
      </PendingButton>
    </form>
  )
}
