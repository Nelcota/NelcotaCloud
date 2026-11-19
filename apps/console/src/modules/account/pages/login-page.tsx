import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { LoginStepContent, type LoginStep } from '@/modules/account/components/login-step-content'
import { LoginStepFooter } from '@/modules/account/components/login-step-footer'
import { loginHeadingOf } from '@/modules/account/model/login-headings'
import {
  type LoginRouteStep,
  invitationOf,
  loginStepOf,
  searchForStep,
} from '@/modules/account/model/login-search'
import { forgetInvitation, rememberInvitation } from '@/modules/account/model/pending-invitation'

/** A step that only makes sense right after an action (MFA, a sent link), so it has no URL. */
type TransientStep = Exclude<LoginStep, { kind: LoginRouteStep }> & { from: LoginRouteStep }

/**
 * Sign-in, sign-up and recovery live in the URL (`?etapa=`), so Back, refresh and shared links
 * keep them. The MFA token and the sent-link notice stay in memory: the token must never reach
 * the URL, and a notice has nothing to show after a refresh.
 */
export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const search = useSearch({ from: '/_public/login' })
  const routeStep = loginStepOf(search)
  const invitation = invitationOf(search)
  const [transient, setTransient] = useState<TransientStep | null>(null)
  const [email, setEmail] = useState('')
  const step = currentStep(routeStep, transient)
  const heading = loginHeadingOf(step.kind, invitation)
  const invitedProject = invitation?.projectName

  // The confirmation email opens in another tab without the invitation, so it is noted here.
  useEffect(() => {
    if (invitedProject === undefined) {
      return
    }

    rememberInvitation({ projectName: invitedProject })
  }, [invitedProject])

  function goToStep(next: LoginRouteStep): void {
    setTransient(null)
    void navigate({ to: '/login', search: searchForStep(next, search) })
  }

  function goToProjects(): void {
    forgetInvitation()
    void navigate({ to: '/' })
  }

  function handleSignIn(result: SignInResult): void {
    if (result.kind === 'mfa_required') {
      setTransient({ kind: 'mfa', mfaToken: result.mfaToken, from: routeStep })
      return
    }

    goToProjects()
  }

  function handleSignUp(result: SignUpResult, signUpEmail: string): void {
    if (result.kind === 'verification_required') {
      setTransient({ kind: 'notice', email: signUpEmail, purpose: 'verification', from: routeStep })
      return
    }

    goToProjects()
  }

  return (
    <AuthCard
      title={heading.title}
      tabTitle={heading.tabTitle}
      description={heading.description}
      mark={heading.mark}
      footer={<LoginStepFooter kind={step.kind} onStep={goToStep} />}
    >
      <LoginStepContent
        step={step}
        email={email}
        handlers={{
          onEmailChange: setEmail,
          onSignIn: handleSignIn,
          onSignUp: handleSignUp,
          onSignInInstead: () => goToStep('sign-in'),
          onForgotPassword: () => goToStep('recover'),
          onMagicLink: () => goToStep('magic-link'),
          onLinkSent: (sentTo, purpose) =>
            setTransient({ kind: 'notice', email: sentTo, purpose, from: routeStep }),
          onSignedIn: goToProjects,
        }}
      />
    </AuthCard>
  )
}

/** A transient step shows only on the URL step it started from; Back or a link clears it. */
function currentStep(routeStep: LoginRouteStep, transient: TransientStep | null): LoginStep {
  if (transient === null || transient.from !== routeStep) {
    return { kind: routeStep }
  }

  return transient
}
