import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { AuthPanel } from '@/modules/account/components/auth-panel'
import { LoginProductPreview } from '@/modules/account/components/login-product-preview'
import {
  LOGIN_STEP_HEADINGS,
  VERIFICATION_SENT,
  type LoginStep,
} from '@/modules/account/components/login-step'
import { LoginStepContent } from '@/modules/account/components/login-step-content'
import { LoginStepFooter } from '@/modules/account/components/login-step-footer'
import { ConsoleBrand } from '@/shared/ui/console-brand'

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
    <div className="flex min-h-dvh gap-2 bg-frame p-2">
      <main className="flex w-full flex-col gap-6 px-2 py-4 sm:px-6 lg:w-[28rem] lg:shrink-0">
        <ConsoleBrand />
        <div className="flex flex-1 flex-col justify-center pb-10">
          <div className="mx-auto w-full max-w-[22.5rem]">
            <AuthPanel>
              <AuthCard
                title={heading.title}
                description={heading.description}
                footer={<LoginStepFooter step={step} onStep={setStep} />}
              >
                <LoginStepContent
                  step={step}
                  onSignIn={handleSignIn}
                  onSignUp={handleSignUp}
                  onStep={setStep}
                  onSignedIn={goToProjects}
                />
              </AuthCard>
            </AuthPanel>
          </div>
        </div>
      </main>
      <LoginProductPreview />
    </div>
  )
}
