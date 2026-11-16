import type { MfaStatus } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

/** Whether the console account asks for a TOTP code at login. */
export function readMfaStatus(): Promise<MfaStatus> {
  return nelcota.auth.mfa.getStatus()
}
