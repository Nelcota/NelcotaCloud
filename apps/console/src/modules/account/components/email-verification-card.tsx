import type { JSX } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { LoginLinkButton } from '@/modules/account/components/login-link-button'
import { useVerifyEmailQuery } from '@/modules/account/queries/use-verify-email-query'
import { ErrorAlert } from '@/shared/ui/error-alert'

type VerificationState = 'incomplete' | 'pending' | 'failed' | 'verified'

const STATES: Record<VerificationState, { title: string; description: string }> = {
  incomplete: {
    title: 'Link incompleto',
    description: 'Abra o link completo do email.',
  },
  pending: {
    title: 'Confirmando seu email',
    description: 'Só um instante.',
  },
  failed: {
    title: 'Email não confirmado',
    description: 'O link expirou ou já foi usado.',
  },
  verified: {
    title: 'Email confirmado',
    description: 'Entre para ver seus projetos.',
  },
}

/** Confirms the email with the link's one-time token and says how it went. */
export function EmailVerificationCard({ token }: { token: string }): JSX.Element {
  const verification = useVerifyEmailQuery(token)
  const state = verificationState(token, verification.isPending, verification.error)
  const content = STATES[state]

  return (
    <AuthCard title={content.title} description={content.description}>
      <p role="status" className="sr-only">
        {content.title}
      </p>
      <ErrorAlert error={verification.error} />
      <LoginLinkButton label="Ir para o login" />
    </AuthCard>
  )
}

function verificationState(token: string, isPending: boolean, error: unknown): VerificationState {
  if (token === '') {
    return 'incomplete'
  }

  if (isPending) {
    return 'pending'
  }

  if (error !== null) {
    return 'failed'
  }

  return 'verified'
}
