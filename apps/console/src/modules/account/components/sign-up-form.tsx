import type { SignUpResult } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { nelcota } from '@/shared/auth/nelcota'
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
  const [error, setError] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      onResult(await nelcota.auth.signUp({ email, password }))
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
        autoComplete="new-password"
        required
        minLength={MIN_PASSWORD_LENGTH}
        hint="Pelo menos 8 caracteres."
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <ErrorAlert error={error} />
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        Criar conta
      </Button>
    </form>
  )
}
