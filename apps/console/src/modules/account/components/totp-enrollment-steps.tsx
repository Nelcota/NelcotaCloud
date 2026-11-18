import type { TotpEnrollment } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { MfaEnrollIllustration } from '@/modules/account/components/mfa-illustrations'
import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { TotpScanStep } from '@/modules/account/components/totp-scan-step'
import { useVerifyTotpMutation } from '@/modules/account/queries/use-mfa'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { BackButton, ForwardLabel } from '@/shared/ui/step-dialog/step-dialog-buttons'
import { StepProgress } from '@/shared/ui/step-dialog/step-progress'

const STEP_LABELS = ['Escanear', 'Confirmar']
const SCAN_STEP = 0

type TotpEnrollmentStepsProps = {
  enrollment: TotpEnrollment
  /** Drops the pending secret; MFA stays off. */
  onCancel: () => void
}

/** Scan the secret into the phone app, then type its first code to turn MFA on. */
export function TotpEnrollmentSteps({
  enrollment,
  onCancel,
}: TotpEnrollmentStepsProps): JSX.Element {
  const [step, setStep] = useState(SCAN_STEP)
  const [code, setCode] = useState('')
  const verification = useVerifyTotpMutation()

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (step === SCAN_STEP) {
      setStep(step + 1)
      return
    }

    verification.mutate(code)
  }

  return (
    <form onSubmit={submit} className="grid gap-5 border-t pt-4">
      <StepProgress labels={STEP_LABELS} current={step} />
      <MfaEnrollIllustration />
      <div key={step} className="animate-step-in grid gap-4 motion-reduce:animate-none">
        <StepContent step={step} enrollment={enrollment} code={code} onCodeChange={setCode} />
      </div>
      <ErrorAlert error={verification.error} />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BackButton
          index={step}
          isDisabled={verification.isPending}
          onBack={() => setStep(SCAN_STEP)}
          onCancel={onCancel}
        />
        <Button type="submit" disabled={verification.isPending} aria-busy={verification.isPending}>
          <ForwardLabel isLast={step !== SCAN_STEP} finishLabel="Ativar MFA" />
        </Button>
      </div>
    </form>
  )
}

type StepContentProps = {
  step: number
  enrollment: TotpEnrollment
  code: string
  onCodeChange: (code: string) => void
}

function StepContent({ step, enrollment, code, onCodeChange }: StepContentProps): JSX.Element {
  if (step === SCAN_STEP) {
    return <TotpScanStep enrollment={enrollment} />
  }

  return (
    <>
      <p className="text-muted-foreground text-sm">
        Digite o código de 6 dígitos que o app mostra agora.
      </p>
      <TotpCodeField value={code} onChange={onCodeChange} autoFocus />
    </>
  )
}
