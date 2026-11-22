import type { JSX } from 'react'

import { TotpEnrollmentSteps } from '@/modules/account/components/totp-enrollment-steps'
import { useEnrollTotpMutation } from '@/modules/account/queries/use-mfa'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'

/** Adds an authenticator: get its secret, then prove it with the first code. */
export function TotpEnrollment(): JSX.Element {
  const enrollment = useEnrollTotpMutation()
  const pending = enrollment.data

  if (pending === undefined) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ErrorAlert error={enrollment.error} />
        <PendingButton
          type="button"
          isPending={enrollment.isPending}
          onClick={() => enrollment.mutate()}
        >
          Ativar MFA
        </PendingButton>
      </div>
    )
  }

  return <TotpEnrollmentSteps enrollment={pending} onCancel={() => enrollment.reset()} />
}
