import type { TotpEnrollment } from '@nelcota/sdk'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'

import { TotpCodeField } from '@/modules/account/components/totp-code-field'
import { TotpScanStep } from '@/modules/account/components/totp-scan-step'
import { useVerifyTotpMutation } from '@/modules/account/queries/use-mfa'
import { cn } from '@/shared/lib/utils'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { BackButton, ForwardButton } from '@/shared/ui/step-dialog/step-dialog-buttons'

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
    <form onSubmit={submit} className="overflow-hidden rounded-lg border">
      <StepTrail current={step} />
      <div className="flex flex-col gap-4 p-4">
        <StepContent step={step} enrollment={enrollment} code={code} onCodeChange={setCode} />
        <ErrorAlert error={verification.error} />
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t bg-surface px-4 py-3">
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

/** The two steps as a header bar, the current one in the brand color. */
function StepTrail({ current }: { current: number }): JSX.Element {
  return (
    <ol
      aria-label="Passos"
      className="flex items-center gap-4 border-b bg-surface px-4 py-2.5 text-xs"
    >
      {STEP_LABELS.map((label, index) => (
        <li
          key={label}
          aria-current={currentMark(index, current)}
          className={cn(
            'flex items-center gap-1.5 text-muted-foreground',
            index === current && 'font-medium text-heading',
          )}
        >
          <span
            className={cn(
              'grid size-5 place-items-center rounded-full border font-mono text-xs',
              index === current && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {index + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  )
}

function currentMark(index: number, current: number): 'step' | undefined {
  if (index !== current) {
    return undefined
  }

  return 'step'
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
      <p className="text-sm text-muted-foreground">
        Digite o código de 6 dígitos que o app mostra agora.
      </p>
      <TotpCodeField value={code} onChange={onCodeChange} hasAutoFocus />
    </>
  )
}
