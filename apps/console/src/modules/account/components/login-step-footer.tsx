import type { JSX } from 'react'

import type { LoginStepKind } from '@/modules/account/model/login-headings'
import type { LoginRouteStep } from '@/modules/account/model/login-search'
import { Button } from '@/shared/ui/button'

type LoginStepFooterProps = {
  kind: LoginStepKind
  onStep: (step: LoginRouteStep) => void
}

/** At the foot of the panel: the way between signing in and signing up, or back to signing in. */
export function LoginStepFooter({ kind, onStep }: LoginStepFooterProps): JSX.Element {
  if (kind === 'sign-in') {
    return (
      <>
        Ainda não tem conta? <FooterLink label="Criar conta" onClick={() => onStep('sign-up')} />
      </>
    )
  }

  if (kind === 'sign-up') {
    return (
      <>
        Já tem conta? <FooterLink label="Entrar" onClick={() => onStep('sign-in')} />
      </>
    )
  }

  return <FooterLink label="Voltar para o login" onClick={() => onStep('sign-in')} />
}

function FooterLink({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <Button
      variant="link"
      className="text-foreground -my-2 h-auto px-0 py-2 text-base font-semibold"
      onClick={onClick}
    >
      {label}
    </Button>
  )
}
