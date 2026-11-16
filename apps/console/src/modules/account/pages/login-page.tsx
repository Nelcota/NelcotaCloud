import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { MfaChallengeForm } from '@/modules/account/components/mfa-challenge-form'
import { RecoverPasswordForm } from '@/modules/account/components/recover-password-form'
import { SignInForm } from '@/modules/account/components/sign-in-form'
import { SignUpForm } from '@/modules/account/components/sign-up-form'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

type LoginStep =
  | { kind: 'sign-in' }
  | { kind: 'sign-up' }
  | { kind: 'mfa'; mfaToken: string }
  | { kind: 'recover' }
  | { kind: 'notice'; message: string }

const STEP_TITLES: Record<LoginStep['kind'], string> = {
  'sign-in': 'Entrar no console',
  'sign-up': 'Criar conta',
  mfa: 'Verificação em duas etapas',
  recover: 'Redefinir senha',
  notice: 'Confira seu email',
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const [step, setStep] = useState<LoginStep>({ kind: 'sign-in' })
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
      setStep({
        kind: 'notice',
        message: 'Enviamos um link de confirmação. Abra-o e depois entre.',
      })
      return
    }

    goToProjects()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STEP_TITLES[step.kind]}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <StepContent
          step={step}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onStep={setStep}
          onSignedIn={goToProjects}
        />
      </CardContent>
    </Card>
  )
}

type StepContentProps = {
  step: LoginStep
  onSignIn: (result: SignInResult) => void
  onSignUp: (result: SignUpResult) => void
  onStep: (step: LoginStep) => void
  onSignedIn: () => void
}

function StepContent(props: StepContentProps): JSX.Element {
  const { step, onStep } = props
  const backToSignIn = (
    <Button variant="link" onClick={() => onStep({ kind: 'sign-in' })}>
      Voltar para o login
    </Button>
  )

  switch (step.kind) {
    case 'sign-up':
      return (
        <>
          <SignUpForm onResult={props.onSignUp} />
          {backToSignIn}
        </>
      )
    case 'mfa':
      return <MfaChallengeForm mfaToken={step.mfaToken} onSignedIn={props.onSignedIn} />
    case 'recover': {
      const sent = {
        kind: 'notice',
        message: 'Se houver uma conta com esse email, o link chega em instantes.',
      } as const
      return (
        <>
          <RecoverPasswordForm onSent={() => onStep(sent)} />
          {backToSignIn}
        </>
      )
    }
    case 'notice':
      return (
        <>
          <p className="text-sm">{step.message}</p>
          {backToSignIn}
        </>
      )
    case 'sign-in':
      return (
        <>
          <SignInForm
            onResult={props.onSignIn}
            onForgotPassword={() => onStep({ kind: 'recover' })}
          />
          <Button variant="outline" onClick={() => onStep({ kind: 'sign-up' })}>
            Criar uma conta
          </Button>
        </>
      )
  }
}
