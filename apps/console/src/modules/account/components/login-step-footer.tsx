import type { JSX } from 'react'

import type { LoginStep } from '@/modules/account/components/login-step'
import { Button } from '@/shared/ui/primitives/button'

type LoginStepFooterProps = {
  step: LoginStep
  onStep: (step: LoginStep) => void
}

/** Under the form, one quiet line: the way between signing in and signing up, or back. */
export function LoginStepFooter({ step, onStep }: LoginStepFooterProps): JSX.Element {
  if (step.kind === 'sign-in') {
    return (
      <AlternateLine
        question="Não tem conta?"
        label="Criar conta"
        onClick={() => onStep({ kind: 'sign-up' })}
      />
    )
  }

  if (step.kind === 'sign-up') {
    return (
      <AlternateLine
        question="Já tem conta?"
        label="Entrar"
        onClick={() => onStep({ kind: 'sign-in' })}
      />
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

type AlternateLineProps = { question: string; label: string; onClick: () => void }

function AlternateLine({ question, label, onClick }: AlternateLineProps): JSX.Element {
  return (
    <p className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
      {question}
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto px-0 font-medium text-foreground"
        onClick={onClick}
      >
        {label}
      </Button>
    </p>
  )
}
