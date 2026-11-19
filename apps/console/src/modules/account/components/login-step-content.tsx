import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import type { JSX } from 'react'

import { EmailSentNotice } from '@/modules/account/components/email-sent-notice'
import { MagicLinkForm } from '@/modules/account/components/magic-link-form'
import { MfaChallengeForm } from '@/modules/account/components/mfa-challenge-form'
import { RecoverPasswordForm } from '@/modules/account/components/recover-password-form'
import { SignInAlternatives } from '@/modules/account/components/sign-in-alternatives'
import { SignInForm } from '@/modules/account/components/sign-in-form'
import { SignUpForm } from '@/modules/account/components/sign-up-form'
import type { SentLinkPurpose } from '@/modules/account/queries/use-resend-link-mutation'

export type LoginStep =
  | { kind: 'sign-in' }
  | { kind: 'sign-up' }
  | { kind: 'recover' }
  | { kind: 'magic-link' }
  | { kind: 'mfa'; mfaToken: string }
  | { kind: 'notice'; email: string; purpose: SentLinkPurpose }

export type LoginStepHandlers = {
  onEmailChange: (email: string) => void
  onSignIn: (result: SignInResult) => void
  onSignUp: (result: SignUpResult, email: string) => void
  /** For an address that already has an account: switch to sign-in, keeping it typed. */
  onSignInInstead: () => void
  onForgotPassword: () => void
  onMagicLink: () => void
  /** A link left by email (recovery or login); the notice says where it went. */
  onLinkSent: (email: string, purpose: SentLinkPurpose) => void
  onSignedIn: () => void
}

type LoginStepContentProps = {
  step: LoginStep
  /** Shared by every form, so switching steps keeps the typed address. */
  email: string
  handlers: LoginStepHandlers
}

/** The form or message of the current login step. */
export function LoginStepContent({ step, email, handlers }: LoginStepContentProps): JSX.Element {
  switch (step.kind) {
    case 'sign-up':
      return (
        <>
          <SignUpForm
            email={email}
            onEmailChange={handlers.onEmailChange}
            onResult={handlers.onSignUp}
            onSignInInstead={handlers.onSignInInstead}
          />
          <SignInAlternatives />
        </>
      )
    case 'mfa':
      return <MfaChallengeForm mfaToken={step.mfaToken} onSignedIn={handlers.onSignedIn} />
    case 'recover':
      return (
        <RecoverPasswordForm
          email={email}
          onEmailChange={handlers.onEmailChange}
          onSent={(sentTo) => handlers.onLinkSent(sentTo, 'recovery')}
        />
      )
    case 'magic-link':
      return (
        <MagicLinkForm
          email={email}
          onEmailChange={handlers.onEmailChange}
          onSent={(sentTo) => handlers.onLinkSent(sentTo, 'magic-link')}
        />
      )
    case 'notice':
      return <EmailSentNotice email={step.email} purpose={step.purpose} />
    case 'sign-in':
      return (
        <>
          <SignInForm
            email={email}
            onEmailChange={handlers.onEmailChange}
            onResult={handlers.onSignIn}
            onForgotPassword={handlers.onForgotPassword}
          />
          <SignInAlternatives onMagicLink={handlers.onMagicLink} />
        </>
      )
  }
}
