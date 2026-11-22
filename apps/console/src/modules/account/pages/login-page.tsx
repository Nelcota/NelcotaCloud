import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
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
      <main className="flex w-full flex-col rounded-xl border bg-background px-6 py-6 sm:px-10 lg:w-[26.25rem] lg:shrink-0">
        <ConsoleBrand />
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
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
        </div>
        <p className="text-xs text-muted-foreground">
          Ao continuar, você concorda com os termos de uso da plataforma.
        </p>
      </main>
      <LoginProductPreview />
    </div>
  )
}
