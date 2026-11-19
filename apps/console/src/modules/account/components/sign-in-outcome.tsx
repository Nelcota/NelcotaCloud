import type { SignInResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { MFA_HEADING } from '@/modules/account/components/mfa-heading'
import { MfaChallengeForm } from '@/modules/account/components/mfa-challenge-form'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import { forgetInvitation } from '@/modules/account/model/pending-invitation'

/**
 * Where a login that finished away from the login page (a provider's redirect, an emailed link)
 * lands: straight into the console, or the MFA code when the account has it on.
 */
export function SignInOutcome({ result }: { result: SignInResult }): JSX.Element {
  const navigate = useNavigate()
  const kind = result.kind

  function goToProjects(): void {
    forgetInvitation()
    void navigate({ to: '/', replace: true })
  }

  useEffect(() => {
    if (kind === 'mfa_required') {
      return
    }

    forgetInvitation()
    void navigate({ to: '/', replace: true })
  }, [kind, navigate])

  if (result.kind !== 'mfa_required') {
    return <SigningIn />
  }

  return (
    <AuthCard
      title={MFA_HEADING.title}
      tabTitle="Verificação"
      description={MFA_HEADING.description}
      mark={AUTH_MARKS.mfa}
    >
      <MfaChallengeForm mfaToken={result.mfaToken} onSignedIn={goToProjects} />
    </AuthCard>
  )
}

export function SigningIn(): JSX.Element {
  return (
    <AuthCard
      title="Entrando na sua conta"
      tabTitle="Entrando"
      description="Só um instante."
      mark={AUTH_MARKS.loading}
    >
      {null}
    </AuthCard>
  )
}
