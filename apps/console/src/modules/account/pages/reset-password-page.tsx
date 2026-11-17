import { Link } from '@tanstack/react-router'
import CircleCheck from '~icons/solar/check-circle-linear'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { ResetPasswordForm } from '@/modules/account/components/reset-password-form'
import { buttonVariants } from '@/shared/ui/button-variants'
import { clearTokenFromLocation, tokenFromLocation } from '@/shared/routing/token-search'

/** Opened from the reset email with its one-time token in the URL fragment. */
export function ResetPasswordPage(): JSX.Element {
  const [token] = useState(tokenFromLocation)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    clearTokenFromLocation()
  }, [])

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
      <ResetPasswordForm token={token} onDone={() => setIsDone(true)} />
    </AuthCard>
  )
}
