import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { BackToLoginLink } from '@/modules/account/components/back-to-login-link'
import { ResendVerificationForm } from '@/modules/account/components/resend-verification-form'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import { BROKEN_LINK } from '@/modules/account/model/broken-link'
import { invitationSearch, type LoginSearch } from '@/modules/account/model/login-search'
import { pendingInvitation } from '@/modules/account/model/pending-invitation'
import { useVerifyEmailQuery } from '@/modules/account/queries/use-verify-email-query'
import { buttonVariants } from '@/shared/ui/button-variants'
import type { StatusMark } from '@/shared/ui/status-icon'

type VerificationState = 'incomplete' | 'pending' | 'failed' | 'verified'

type StateContent = { title: string; description?: string; mark: StatusMark }

const STATES: Record<VerificationState, StateContent> = {
  incomplete: BROKEN_LINK,
  pending: {
    title: 'Confirmando seu email',
    description: 'Só um instante.',
    mark: AUTH_MARKS.loading,
  },
  failed: {
    title: 'Não deu para confirmar',
    description: 'O link já foi usado ou expirou. Peça um novo com o email da sua conta.',
    mark: AUTH_MARKS.failed,
  },
  verified: {
    title: 'Email confirmado',
    mark: AUTH_MARKS.done,
  },
}

/** Confirms the email with the link's one-time token and shows how it went. */
export function EmailVerificationCard({ token }: { token: string }): JSX.Element {
  const verification = useVerifyEmailQuery(token)
  const state = verificationState(token, verification.isPending, verification.error)
  const content = STATES[state]

  return (
    <AuthCard
      title={content.title}
      tabTitle="Confirmar email"
      description={content.description}
      mark={content.mark}
      footer={<VerificationFooter state={state} />}
    >
      <VerificationAction state={state} />
    </AuthCard>
  )
}

/** A failed link leads to a new one; a confirmed email leads to signing in; waiting shows nothing. */
function VerificationAction({ state }: { state: VerificationState }): JSX.Element | null {
  if (state === 'pending') {
    return null
  }

  if (state === 'verified') {
    return (
      <Link to="/login" search={signInSearch()} className={buttonVariants({ size: 'lg' })}>
        Entrar
      </Link>
    )
  }

  return <ResendVerificationForm />
}

function VerificationFooter({ state }: { state: VerificationState }): JSX.Element | null {
  if (state === 'pending' || state === 'verified') {
    return null
  }

  return <BackToLoginLink />
}

/** Someone who signed up from an invitation goes back to it, still told what they are joining. */
function signInSearch(): LoginSearch {
  const invitation = pendingInvitation()

  if (invitation === null) {
    return { etapa: 'entrar' }
  }

  return { etapa: 'entrar', ...invitationSearch(invitation) }
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
