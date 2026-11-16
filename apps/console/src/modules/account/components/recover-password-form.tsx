import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { nelcota } from '@/shared/auth/nelcota'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

/** Asks for a reset link; the answer is the same whether or not the email has an account. */
export function RecoverPasswordForm({ onSent }: { onSent: () => void }): JSX.Element {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await nelcota.auth.recoverPassword({ email })
      onSent()
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
      <ErrorAlert error={error} />
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        Enviar link de redefinição
      </Button>
    </form>
  )
}
