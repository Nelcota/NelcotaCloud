import type { Session } from '@nelcota/sdk'

import { nelcota } from '@/shared/auth/nelcota'

export type MfaChallenge = { mfaToken: string; code: string }

/** Second step of a login when the account has TOTP on. */
export function verifyMfa(challenge: MfaChallenge): Promise<Session> {
  return nelcota.auth.verifyMfa(challenge)
}
