import { Link, useSearch } from '@tanstack/react-router'
import CircleCheck from '~icons/solar/check-circle-linear'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { nelcota } from '@/shared/auth/nelcota'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
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
      <AuthCard
        title="Senha alterada"
        description="Por segurança, todas as sessões abertas foram encerradas."
        icon={<CircleCheck aria-hidden="true" className="mb-4 size-10 text-emerald-500" />}
      >
        <Link to="/login" className={buttonVariants({ size: 'lg' })}>
          Entrar com a nova senha
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nova senha" description="Escolha uma senha com pelo menos 8 caracteres.">
      <form className="grid gap-4" onSubmit={submit}>
        <FormField
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          autoFocus
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <ErrorAlert error={error} />
        <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
          Salvar senha
        </Button>
      </form>
    </AuthCard>
  )
}
