import type { SignInResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { nelcota } from '@/shared/auth/nelcota'
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
  const [error, setError] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      onResult(await nelcota.auth.signInWithPassword({ email, password }))
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <FormField
        label="Email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <FormField
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={error} />
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        Entrar
      </Button>
      <Button type="button" variant="link" onClick={onForgotPassword}>
        Esqueci minha senha
      </Button>
    </form>
  )
}
