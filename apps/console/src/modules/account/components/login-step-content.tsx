import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import type { JSX } from 'react'

import { RECOVERY_SENT, type LoginStep } from '@/modules/account/components/login-step'
import { MfaChallengeForm } from '@/modules/account/components/mfa-challenge-form'
import { RecoverPasswordForm } from '@/modules/account/components/recover-password-form'
import { SignInForm } from '@/modules/account/components/sign-in-form'
import { SignUpForm } from '@/modules/account/components/sign-up-form'

type LoginStepContentProps = {
  step: LoginStep
  onSignIn: (result: SignInResult) => void
  onSignUp: (result: SignUpResult) => void
  onStep: (step: LoginStep) => void
  onSignedIn: () => void
}

/** The form (or message) of the current login step. */
export function LoginStepContent(props: LoginStepContentProps): JSX.Element {
  const { step, onStep } = props

  switch (step.kind) {
    case 'sign-up':
      return <SignUpForm onResult={props.onSignUp} />
    case 'mfa':
      return <MfaChallengeForm mfaToken={step.mfaToken} onSignedIn={props.onSignedIn} />
    case 'recover':
      return <RecoverPasswordForm onSent={() => onStep(RECOVERY_SENT)} />
    case 'notice':
      return (
        <p role="status" className="text-sm text-pretty">
          {step.message}
        </p>
      )
    case 'sign-in':
      return (
        <SignInForm
          onResult={props.onSignIn}
          onForgotPassword={() => onStep({ kind: 'recover' })}
        />
      )
  }
}
