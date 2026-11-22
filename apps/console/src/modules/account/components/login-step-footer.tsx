import type { JSX } from 'react'

import type { LoginStep } from '@/modules/account/components/login-step'
import { Button } from '@/shared/ui/primitives/button'

type LoginStepFooterProps = {
  step: LoginStep
  onStep: (step: LoginStep) => void
}

/** The panel's footer bar: the way between signing in and signing up (with the terms), or back. */
export function LoginStepFooter({ step, onStep }: LoginStepFooterProps): JSX.Element {
  if (step.kind === 'sign-in') {
    return (
      <>
        <AlternateLine
          question="Não tem conta?"
          label="Criar conta"
          onClick={() => onStep({ kind: 'sign-up' })}
        />
        <TermsLine />
      </>
    )
  }

  if (step.kind === 'sign-up') {
    return (
      <>
        <AlternateLine
          question="Já tem conta?"
          label="Entrar"
          onClick={() => onStep({ kind: 'sign-in' })}
        />
        <TermsLine />
      </>
    )
  }

  return (
    <AlternateLine
      question=""
      label="Voltar para o login"
      onClick={() => onStep({ kind: 'sign-in' })}
    />
  )
}

function TermsLine(): JSX.Element {
  return (
    <p className="text-2xs text-pretty text-muted-foreground">
      Ao continuar, você concorda com os termos de uso da plataforma.
    </p>
  )
}

type AlternateLineProps = { question: string; label: string; onClick: () => void }

function AlternateLine({ question, label, onClick }: AlternateLineProps): JSX.Element {
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {question}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0 text-xs font-medium text-foreground hover:text-foreground"
        onClick={onClick}
      >
        {label}
      </Button>
    </p>
  )
}
