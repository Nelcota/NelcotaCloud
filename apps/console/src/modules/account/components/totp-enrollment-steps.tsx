import type { TotpEnrollment } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import {
  EnrollmentStepItem,
  type EnrollmentStepState,
} from '@/modules/account/components/enrollment-step-item'
import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { TotpScanStep } from '@/modules/account/components/totp-scan-step'
import { useVerifyTotpMutation } from '@/modules/account/queries/use-mfa'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { BackButton, ForwardButton } from '@/shared/ui/step-dialog/step-dialog-buttons'

const SCAN_STEP = 0
const CONFIRM_STEP = 1

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
      setStep(CONFIRM_STEP)
      return
    }

    verification.mutate(code)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-lg bg-surface p-4">
      <ol aria-label="Passos" className="grid gap-3">
        <EnrollmentStepItem label="Escanear o QR code" state={stateOf(SCAN_STEP, step)}>
          <TotpScanStep enrollment={enrollment} />
        </EnrollmentStepItem>
        <EnrollmentStepItem label="Confirmar o primeiro código" state={stateOf(CONFIRM_STEP, step)}>
          <p className="text-xs text-muted-foreground">
            Digite o código de 6 dígitos que o app mostra agora.
          </p>
          <TotpCodeField value={code} onChange={setCode} hasAutoFocus />
        </EnrollmentStepItem>
      </ol>
      <ErrorAlert error={verification.error} />
      <div className="flex flex-wrap justify-end gap-2">
        <BackButton
          index={step}
          isDisabled={verification.isPending}
          onBack={() => setStep(SCAN_STEP)}
          onCancel={onCancel}
        />
        <ForwardButton
          isLast={step !== SCAN_STEP}
          isWorking={verification.isPending}
          isDisabled={step !== SCAN_STEP && code.trim() === ''}
          finishLabel="Ativar MFA"
        />
      </div>
    </form>
  )
}

function stateOf(index: number, current: number): EnrollmentStepState {
  if (index < current) {
    return 'done'
  }

  if (index === current) {
    return 'current'
  }

  return 'pending'
}
