import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { AuthHeading } from '@/modules/account/components/auth-heading'
import { AuthScreen } from '@/modules/account/components/auth-screen'
import { AuthShowcase } from '@/modules/account/components/auth-showcase'
import { AuthStepChrome } from '@/modules/account/components/auth-step-chrome'
import {
  LOGIN_STEP_HEADINGS,
  VERIFICATION_SENT,
  type LoginStep,
} from '@/modules/account/components/login-step'
import { LoginStepContent } from '@/modules/account/components/login-step-content'

export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const [step, setStep] = useState<LoginStep>({ kind: 'sign-in' })
  const heading = LOGIN_STEP_HEADINGS[step.kind]
  const goToProjects = (): void => {
    void navigate({ to: '/' })
  }

  function handleSignIn(result: SignInResult): void {
    if (result.kind === 'mfa_required') {
      setStep({ kind: 'mfa', mfaToken: result.mfaToken })
      return
    }

    goToProjects()
  }

  function handleSignUp(result: SignUpResult): void {
    if (result.kind === 'verification_required') {
      setStep(VERIFICATION_SENT)
      return
    }

    goToProjects()
  }

  return (
    <AuthScreen showcase={<AuthShowcase />}>
      <AuthStepChrome step={step} onStep={setStep} />
      <AuthHeading title={heading.title} description={heading.description} />
      <div key={step.kind} className="animate-page-in">
        <LoginStepContent
          step={step}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onStep={setStep}
          onSignedIn={goToProjects}
        />
      </div>
    </AuthScreen>
  )
}
