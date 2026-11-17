import type { SignInResult, SignUpResult } from '@nelcota/sdk'
import { useNavigate } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { MfaChallengeForm } from '@/modules/account/components/mfa-challenge-form'
import { RecoverPasswordForm } from '@/modules/account/components/recover-password-form'
import { SignInForm } from '@/modules/account/components/sign-in-form'
import { SignUpForm } from '@/modules/account/components/sign-up-form'
import { Button } from '@/shared/ui/button'

type LoginStep =
  | { kind: 'sign-in' }
  | { kind: 'sign-up' }
  | { kind: 'mfa'; mfaToken: string }
  | { kind: 'recover' }
  | { kind: 'notice'; message: string }

const STEP_HEADINGS: Record<LoginStep['kind'], { title: string; description?: string }> = {
  'sign-in': { title: 'Entrar na sua conta' },
  'sign-up': { title: 'Criar conta', description: 'Uma conta para criar e gerenciar projetos.' },
  mfa: {
    title: 'Verificação em duas etapas',
    description: 'Digite o código de 6 dígitos do seu app autenticador.',
  },
  recover: {
    title: 'Redefinir senha',
    description: 'Informe seu email e enviamos um link para criar uma senha nova.',
  },
  notice: { title: 'Confira seu email', description: 'O link chega em instantes.' },
}

const RECOVERY_SENT: LoginStep = {
  kind: 'notice',
  message: 'Se houver uma conta com esse email, o link de redefinição chega em instantes.',
}

export function LoginPage(): JSX.Element {
  const navigate = useNavigate()
  const [step, setStep] = useState<LoginStep>({ kind: 'sign-in' })
  const heading = STEP_HEADINGS[step.kind]
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
    <AuthCard
      title={heading.title}
      description={heading.description}
      footer={<StepFooter step={step} onStep={setStep} />}
    >
      <StepContent
        step={step}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onStep={setStep}
        onSignedIn={goToProjects}
      />
    </AuthCard>
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

  switch (step.kind) {
    case 'sign-up':
      return <SignUpForm onResult={props.onSignUp} />
    case 'mfa':
      return <MfaChallengeForm mfaToken={step.mfaToken} onSignedIn={props.onSignedIn} />
    case 'recover':
      return <RecoverPasswordForm onSent={() => onStep(RECOVERY_SENT)} />
    case 'notice':
      return <p className="text-lg text-pretty">{step.message}</p>
    case 'sign-in':
      return (
        <SignInForm
          onResult={props.onSignIn}
          onForgotPassword={() => onStep({ kind: 'recover' })}
        />
      )
  }
}

/** Under the card: the way between signing in and signing up, or back to signing in. */
function StepFooter({
  step,
  onStep,
}: {
  step: LoginStep
  onStep: (step: LoginStep) => void
}): JSX.Element {
  if (step.kind === 'sign-in') {
    return (
      <>
        Ainda não tem conta?{' '}
        <FooterLink label="Criar conta" onClick={() => onStep({ kind: 'sign-up' })} />
      </>
    )
  }

  if (step.kind === 'sign-up') {
    return (
      <>
        Já tem conta? <FooterLink label="Entrar" onClick={() => onStep({ kind: 'sign-in' })} />
      </>
    )
  }

  return <FooterLink label="Voltar para o login" onClick={() => onStep({ kind: 'sign-in' })} />
}

function FooterLink({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <Button variant="link" className="h-auto p-0 text-base" onClick={onClick}>
      {label}
    </Button>
  )
}
