import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { LoginLinkButton } from '@/modules/account/components/login-link-button'
import { ResetPasswordForm } from '@/modules/account/components/reset-password-form'
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
      <AuthCard title="Senha alterada" description="Todas as sessões foram encerradas.">
        <LoginLinkButton label="Entrar com a nova senha" />
      </AuthCard>
    )
  }

  // The link was cut, or the page reloaded after the token left the URL: nothing to redeem.
  if (token === '') {
    return (
      <AuthCard title="Link inválido" description="Peça outro link na tela de login.">
        <LoginLinkButton label="Ir para o login" />
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nova senha" description="Pelo menos 8 caracteres.">
      <ResetPasswordForm token={token} onDone={() => setIsDone(true)} />
    </AuthCard>
  )
}
