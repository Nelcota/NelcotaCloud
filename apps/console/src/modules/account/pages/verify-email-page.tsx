import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { EmailVerificationCard } from '@/modules/account/components/email-verification-card'
import { clearTokenFromLocation, tokenFromLocation } from '@/shared/routing/token-search'

/** Opened from the confirmation email with its one-time token in the URL fragment. */
export function VerifyEmailPage(): JSX.Element {
  const [token] = useState(tokenFromLocation)

  useEffect(() => {
    clearTokenFromLocation()
  }, [])

  return <EmailVerificationCard token={token} />
}
