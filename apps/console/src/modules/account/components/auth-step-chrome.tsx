import type { JSX } from 'react'

import { AuthBackButton } from '@/modules/account/components/auth-back-button'
import { type AuthMode, AuthModeSwitch } from '@/modules/account/components/auth-mode-switch'
import type { LoginStep } from '@/modules/account/components/login-step'

type AuthStepChromeProps = { step: LoginStep; onStep: (step: LoginStep) => void }

/** Above the heading: the sign-in/sign-up switch on those two steps, a way back on the others. */
export function AuthStepChrome({ step, onStep }: AuthStepChromeProps): JSX.Element {
  if (step.kind === 'sign-in' || step.kind === 'sign-up') {
    return (
      <AuthModeSwitch mode={step.kind} onModeChange={(mode: AuthMode) => onStep({ kind: mode })} />
    )
  }

  return <AuthBackButton onBack={() => onStep({ kind: 'sign-in' })} />
}
