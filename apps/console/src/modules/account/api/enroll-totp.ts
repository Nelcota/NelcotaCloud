import type { TotpEnrollment } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

/** Starts adding an authenticator; it is active only after its first code is verified. */
export function enrollTotp(): Promise<TotpEnrollment> {
  return nelcota.auth.mfa.enrollTotp()
}
