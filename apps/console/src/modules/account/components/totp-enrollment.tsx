import type { JSX } from 'react'

import { TotpEnrollmentSteps } from '@/modules/account/components/totp-enrollment-steps'
import { useEnrollTotpMutation } from '@/modules/account/queries/use-mfa'
import { Button } from '@/shared/ui/button'
import { ErrorAlert } from '@/shared/ui/error-alert'

/** Adds an authenticator: get its secret, then prove it with the first code. */
export function TotpEnrollment(): JSX.Element {
  const enrollment = useEnrollTotpMutation()
  const pending = enrollment.data

  if (pending === undefined) {
    return (
      <div className="grid gap-3">
        <ErrorAlert error={enrollment.error} />
        <div>
          <Button
            disabled={enrollment.isPending}
            aria-busy={enrollment.isPending}
            onClick={() => enrollment.mutate()}
          >
            Ativar MFA
          </Button>
        </div>
      </div>
    )
  }

  return <TotpEnrollmentSteps enrollment={pending} onCancel={() => enrollment.reset()} />
}
