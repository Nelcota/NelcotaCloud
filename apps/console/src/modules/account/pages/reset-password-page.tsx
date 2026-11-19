import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { BackToLoginLink } from '@/modules/account/components/back-to-login-link'
import { ResetPasswordForm } from '@/modules/account/components/reset-password-form'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import { BROKEN_LINK } from '@/modules/account/model/broken-link'
import { forgetResetToken, resetTokenOnLoad } from '@/modules/account/model/reset-token-store'
import { buttonVariants } from '@/shared/ui/button-variants'
import { clearTokenFromLocation } from '@/shared/routing/token-search'

/** Opened from the reset email with its one-time token in the URL fragment. */
export function ResetPasswordPage(): JSX.Element {
  const [token] = useState(resetTokenOnLoad)
  const [isDone, setIsDone] = useState(false)

  useEffect(() => {
    clearTokenFromLocation()
  }, [])

  function finish(): void {
    forgetResetToken()
    setIsDone(true)
  }

  if (isDone) {
    return (
      <AuthCard
        title="Senha trocada"
        tabTitle="Senha trocada"
        description="Entre de novo com a senha nova."
        mark={AUTH_MARKS.done}
      >
        <Link to="/login" className={buttonVariants({ size: 'lg' })}>
          Entrar
        </Link>
      </AuthCard>
    )
  }

  // The link was cut, or opened in a tab that never had the token: nothing to redeem.
  if (token === '') {
    return (
      <AuthCard
        title={BROKEN_LINK.title}
        tabTitle="Nova senha"
        description={BROKEN_LINK.description}
        mark={BROKEN_LINK.mark}
        footer={<BackToLoginLink />}
      >
        <Link
          to="/login"
          search={{ etapa: 'recuperar' }}
          className={buttonVariants({ size: 'lg' })}
        >
          Pedir novo link
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Crie uma senha nova"
      tabTitle="Nova senha"
      mark={AUTH_MARKS.newPassword}
      footer={<BackToLoginLink />}
    >
      <ResetPasswordForm token={token} onDone={finish} />
    </AuthCard>
  )
}
