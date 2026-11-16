import { nelcota } from '@/shared/auth/nelcota'

/** Turns MFA off; a current code proves the authenticator is at hand. */
export function disableTotp(code: string): Promise<void> {
  return nelcota.auth.mfa.disableTotp({ code })
}
