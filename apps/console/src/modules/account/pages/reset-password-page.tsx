import { Link, useSearch } from '@tanstack/react-router'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { nelcota } from '@/shared/auth/nelcota'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'

const MIN_PASSWORD_LENGTH = 8

/** Opened from the reset email: `/auth/reset-password?token=…`. */
export function ResetPasswordPage(): JSX.Element {
  const { token } = useSearch({ from: '/_public/auth/reset-password' })
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [isDone, setIsDone] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await nelcota.auth.resetPassword({ token: token, password })
      setIsDone(true)
    } catch (caught) {
      setError(caught)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isDone) {
    return (
      <div className="text-sm">
        <p className="mb-4">Senha alterada. Todas as sessões foram encerradas.</p>
        <Link to="/login" className="underline underline-offset-4">
          Entrar
        </Link>
      </div>
    )
  }

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Nova senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={submit}>
            <FormField
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <ErrorAlert error={error} />
            <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
              Salvar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
