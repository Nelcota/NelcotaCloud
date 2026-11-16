import { nelcota } from '@/shared/auth/nelcota'

/** The first code from the authenticator turns MFA on. */
export function verifyTotp(code: string): Promise<void> {
  return nelcota.auth.mfa.verifyTotp({ code })
}
